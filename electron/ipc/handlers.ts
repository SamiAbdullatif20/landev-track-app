import { BrowserWindow, dialog, ipcMain, app, shell } from "electron";
import { startSessionPowerBlocker, stopSessionPowerBlocker } from "../services/session-power";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { IPC_CHANNELS } from "./channels";
import { eventSchema, loginSchema, startSchema, stopSchema } from "./schemas";
import { formatUnknownErrorMessage } from "../api/error-message";
import { z } from "zod";
import * as api from "../api/client";
import {
  clearSessionCookie,
  clearToken,
  readSessionCookie,
  readToken,
  saveSessionCookie,
  saveToken
} from "../security/token-store";
import {
  backfillWorkSessionIdOnPendingEvents,
  clearSyntheticSessionPendingEvents,
  clearUndeliveredQueuedEvents,
  getSessionState,
  getSetting,
  resetActiveSessionState,
  saveSessionState,
  setSetting
} from "../db/queue-repo";
import { backfillWorkSessionIdOnPendingScreenshots } from "../db/screenshot-queue";
import { logger } from "../config/logger";
import { SyncWorker } from "../services/sync-worker";
import { ProjectSyncService } from "../services/project-sync-service";
import { readAuthContext, refreshAuthSession, isAuthenticated } from "../services/auth-session";
import { saveCredentials, clearCredentials, readCredentials } from "../security/credential-store";
import {
  clearActiveSessionOwner,
  clearCurrentAppUser,
  getCurrentAppUserKey,
  isActiveSessionOwnedByCurrentUser,
  setActiveSessionOwnerKey,
  setCurrentAppUser
} from "../db/user-scope";
import { releaseActiveSessionIfForeignUser, sessionStateForCurrentUser } from "../services/session-ownership";
import { clearProjectsCache } from "../db/projects-cache";
import type { Project } from "../api/client";
import type { RoleProject } from "../config/role-project-catalog";
import { readEnv } from "../config/env";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { trackingDiagnostics } from "../services/tracking-diagnostics";
import { ScreenshotWorker } from "../services/screenshot-worker";
import { uploadScreenshotOrEnqueue } from "../services/screenshot-upload-or-queue";
import { EventDrivenTrackingAgent } from "../services/event-driven-tracking-agent";
import { InputActivitySampler } from "../services/input-activity-sampler";
import { AppFocusPoller } from "../services/app-focus-poller";
import {
  resetAndWarmUpWindowsProbes,
  stopAllWindowsProbeSessions
} from "../services/probe-session-lifecycle";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled
} from "../services/notification-settings";
import { clearAppFocusDedupeState } from "../services/tracking-app-focus";
import { clearEngagementPersistenceState } from "../services/activity-engagement";
import { clearInputActivityRollup } from "../services/input-activity-rollup";
import { clearActivityIntervalTracker } from "../services/activity-interval-tracker";
import { flushPendingActivityIntervals } from "../services/tracking-activity-interval";
import { hasUsableWorkSessionId } from "../services/session-event-fields";
import { buildSessionStopInput } from "../services/session-stop-payload";
import {
  catalogDisplayNameFromProjectId,
  DESIGNER_PROJECT_NAMES,
  isCatalogProjectId,
  isModeratorRole,
  isNonChargeableProjectName,
  mergeCatalogWithApi,
  MODERATOR_PROJECT_NAMES,
  resolveProjectsForRoles
} from "../config/role-project-catalog";
import { clearCachedUserRoles, fetchUserRoles, readCachedUserRoles } from "../api/client";
import { getRecentWorkTasks } from "../db/recent-tasks";
import {
  clearActiveSessionProjectName,
  getWorkSummary,
  recordCompletedWorkSession,
  resolveMirroredSessionStartedAt,
  setActiveSessionProjectName
} from "../db/work-log";
import { TrackingOverlayManager } from "../services/tracking-overlay";
import { SessionRemoteSyncService } from "../services/session-remote-sync";
import {
  isActiveSessionStartConflictError,
  resolveAndCloseStaleRemoteSession,
  reconcileActiveSessionStartConflict
} from "../services/session-start-reconcile";
import { syncPendingRemoteSessionStart } from "../services/session-remote-start-sync";
import type { RemoteSessionStatus } from "../services/session-remote-status";

let stopActiveTrackingSession: ((
  stoppedAt: string,
  options?: { awaitBackgroundSync?: boolean }
) => Promise<api.SessionStopResult>) | null = null;

export async function stopActiveSessionIfRunning(
  options: { awaitBackgroundSync?: boolean } = {}
): Promise<boolean> {
  if (!getSessionState().active || !stopActiveTrackingSession) {
    return false;
  }
  try {
    await stopActiveTrackingSession(new Date().toISOString(), options);
    return true;
  } catch (error) {
    logger.warn("stop-active-session-on-quit-failed", { error });
    return false;
  }
}

function asUserError(error: unknown): Error {
  if (error instanceof api.ApiError) {
    return new Error(`${error.kind.toUpperCase()}: ${error.message}`);
  }

  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    const message =
      formatUnknownErrorMessage(issue)
      ?? issue?.message
      ?? "Invalid request.";
    return new Error(`VALIDATION: ${message}`);
  }

  if (error instanceof Error) {
    return new Error(`SERVER: ${error.message}`);
  }

  return new Error("SERVER: Unexpected failure.");
}

function normalizeSessionState() {
  const state = sessionStateForCurrentUser();
  const normalizedSessionId =
    typeof state.sessionId === "string" && /^\d{13,}$/.test(state.sessionId)
      ? null
      : state.sessionId;
  return {
    active: Boolean(state.active),
    sessionId: normalizedSessionId,
    projectId: state.projectId,
    description: state.description,
    startedAt: state.startedAt
  };
}

let ipcHandlersRegistered = false;

function sendSessionStatus(mainWindow: BrowserWindow, overlay?: TrackingOverlayManager): void {
  const state = normalizeSessionState();
  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.setBackgroundThrottling(!state.active);
  }
  mainWindow.webContents.send("tracking:status-push", state);
  overlay?.syncVisibility();
}

function authContext() {
  return {
    ...readAuthContext(),
    onAuthRefresh: refreshAuthSession
  };
}

function resolveVisibleProjects(apiProjects: Project[], roles: string[]): RoleProject[] {
  let projects = resolveProjectsForRoles(apiProjects, roles);
  if (projects.length === 0) {
    projects = isModeratorRole(roles)
      ? mergeCatalogWithApi(apiProjects, MODERATOR_PROJECT_NAMES)
      : mergeCatalogWithApi(apiProjects, DESIGNER_PROJECT_NAMES);
  }
  return projects;
}

const MAX_PER_EVENT_SECONDS = 300;
const MAX_LOCAL_VERIFY_EVENTS = 300;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  return Number.isFinite(value) ? value : null;
}

function clampSeconds(value: number | null): number {
  return Math.min(MAX_PER_EVENT_SECONDS, Math.max(0, Math.floor(value ?? 0)));
}

function enrichSessionStartPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const record = payload as Record<string, unknown>;
  const projectId = typeof record.projectId === "string" ? record.projectId.trim() : "";
  const projectName = typeof record.projectName === "string" ? record.projectName.trim() : "";
  if (!projectId || projectName || !isCatalogProjectId(projectId)) {
    return payload;
  }
  const resolved = catalogDisplayNameFromProjectId(projectId);
  if (!resolved) {
    return payload;
  }
  logger.info("tracking-start-projectname-enriched", { projectId, projectName: resolved });
  return { ...record, projectName: resolved };
}


function resolveRemoteProject(remote: RemoteSessionStatus): {
  projectId: string;
  projectName: string;
  isNonChargeable: boolean;
} | null {
  const projectName = remote.projectName?.trim();
  const projectId = remote.projectId?.trim();
  if (projectId) {
    return {
      projectId,
      projectName: projectName ?? projectId,
      isNonChargeable: isCatalogProjectId(projectId) || (projectName ? isNonChargeableProjectName(projectName) : false)
    };
  }
  if (projectName) {
    const slug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return {
      projectId: `catalog:${slug || "unknown"}`,
      projectName,
      isNonChargeable: isNonChargeableProjectName(projectName)
    };
  }
  return null;
}

export function registerIpc(mainWindow: BrowserWindow): void {
  if (ipcHandlersRegistered) {
    return;
  }
  ipcHandlersRegistered = true;

  const env = readEnv();
  const electronDir = path.dirname(fileURLToPath(import.meta.url));
  const preloadPath = path.join(electronDir, "preload.mjs");
  const rendererDist = path.join(process.env.APP_ROOT ?? app.getAppPath(), "dist");
  const overlayHtmlPath = path.join(rendererDist, "overlay.html");
  const overlayUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}/overlay.html`
    : pathToFileURL(overlayHtmlPath).href;
  const trackingOverlay = new TrackingOverlayManager({
    preloadPath,
    overlayUrl
  });
  const worker = new SyncWorker({
    window: mainWindow,
    onSyncResult: (result) => {
      trackingDiagnostics.recordSync(result.ok, result.statusCode, result.message);
      if (result.ok) {
        void syncPendingRemoteSessionStart({
          ...readAuthContext(),
          onAuthRefresh: refreshAuthSession
        });
      }
    }
  });
  const projectSync = new ProjectSyncService({
    window: mainWindow,
    resolveVisibleProjects,
    fetchRoles: async (ctx) => {
      const roles = readCachedUserRoles();
      if (roles.length > 0) {
        return roles;
      }
      return fetchUserRoles(ctx);
    },
    shouldRunTimerSync: () => !getSessionState().active
  });

  // Refresh the project list when the user returns to the window (they may be
  // about to pick a project), throttled so rapid focus toggling can't spam it.
  const FOCUS_PROJECT_SYNC_THROTTLE_MS = 2 * 60_000;
  let lastFocusProjectSyncMs = 0;
  mainWindow.on("focus", () => {
    if (!isAuthenticated() || getSessionState().active) {
      return;
    }
    const now = Date.now();
    if (now - lastFocusProjectSyncMs < FOCUS_PROJECT_SYNC_THROTTLE_MS) {
      return;
    }
    lastFocusProjectSyncMs = now;
    void projectSync.syncNow().catch((error) => {
      logger.warn("project-sync-focus-failed", { error });
    });
  });

  const startLiveSync = (): void => {
    projectSync.start();
    worker.start();
    sessionRemoteSync?.start();
  };

  const stopLiveSync = (): void => {
    sessionRemoteSync?.stop();
    projectSync.stop();
    worker.stop();
  };

  let sessionRemoteSync: SessionRemoteSyncService | undefined;

  const clearedOnBoot = clearSyntheticSessionPendingEvents();
  if (clearedOnBoot > 0) {
    logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedOnBoot });
  }
  const screenshotWorker = new ScreenshotWorker({
    uploadScreenshot: async (payload) => {
      await uploadScreenshotOrEnqueue(payload, {
        ...authContext(),
        onAuthRefresh: refreshAuthSession
      });
    },
    onUploadComplete: () => {
      void worker.flush();
    }
  });
  const trackingAgent = new EventDrivenTrackingAgent();
  const inputActivitySampler = new InputActivitySampler();
  const appFocusPoller = new AppFocusPoller();

  const stopTrackingCapture = (): void => {
    inputActivitySampler.stop();
    appFocusPoller.stop();
    screenshotWorker.stop();
    stopAllWindowsProbeSessions();
    clearAppFocusDedupeState();
    clearEngagementPersistenceState();
    void flushPendingActivityIntervals();
    clearInputActivityRollup();
    clearActivityIntervalTracker();
  };

  const notifySessionStatus = (): void => {
    sendSessionStatus(mainWindow, trackingOverlay);
  };

  const applyAccountContext = (username: string): void => {
    setCurrentAppUser(username);
    const released = releaseActiveSessionIfForeignUser({
      stopCapture: stopTrackingCapture,
      notifyStatus: notifySessionStatus
    });
    if (released) {
      logger.info("active-session-released-foreign-user", { username });
    }
  };

  const finalizeAccountLogout = (): void => {
    clearUndeliveredQueuedEvents();
    resetActiveSessionState();
    clearActiveSessionOwner();
    clearCurrentAppUser();
    clearActiveSessionProjectName();
    setSetting("activeSessionIsNonChargeable", "false");
  };

  if (isAuthenticated()) {
    const savedCredentials = readCredentials();
    if (savedCredentials) {
      applyAccountContext(savedCredentials.username);
    }
  } else if (getSessionState().active) {
    stopTrackingCapture();
    resetActiveSessionState();
    clearActiveSessionOwner();
  }

  const recoverOrphanedActiveSessionOnBoot = async (): Promise<void> => {
    const state = getSessionState();
    if (!state.active) {
      return;
    }

    if (!isAuthenticated()) {
      stopTrackingCapture();
      resetActiveSessionState();
      clearActiveSessionOwner();
      return;
    }

    if (!isActiveSessionOwnedByCurrentUser()) {
      releaseActiveSessionIfForeignUser({
        stopCapture: stopTrackingCapture,
        notifyStatus: notifySessionStatus
      });
      return;
    }

    const ctx = authContext();
    try {
      const remote = await api.fetchRemoteSessionStatus({
        ...ctx,
        onAuthRefresh: refreshAuthSession
      });

      if (remote.active) {
        const sessionId = hasUsableWorkSessionId(remote.sessionId)
          ? remote.sessionId
          : state.sessionId;
        const projectName =
          getSetting("activeSessionProjectName")
          ?? catalogDisplayNameFromProjectId(state.projectId ?? "")
          ?? state.projectId
          ?? "";

        logger.info("session-boot-resume-remote-active", {
          sessionId,
          projectId: state.projectId,
          startedAt: state.startedAt
        });

        await startLocalCapture({
          projectId: state.projectId ?? "",
          projectName,
          description: state.description ?? "",
          startedAt: state.startedAt ?? new Date().toISOString(),
          sessionId: hasUsableWorkSessionId(sessionId) ? sessionId : null,
          isNonChargeable: getSetting("activeSessionIsNonChargeable") === "true"
        });
        sessionRemoteSync?.markLocalUserAction();
        sendSessionStatus(mainWindow, trackingOverlay);
        return;
      }
    } catch (error) {
      logger.warn("session-boot-remote-status-failed", { error });
    }

    const stoppedAt = new Date().toISOString();
    logger.info("session-orphan-recovery-stop", {
      sessionId: state.sessionId,
      startedAt: state.startedAt,
      stoppedAt
    });

    try {
      await resolveAndCloseStaleRemoteSession({
        ...ctx,
        onAuthRefresh: refreshAuthSession
      });
    } catch (error) {
      logger.warn("session-orphan-remote-close-failed", { error });
    }

    try {
      await performSessionStop(stoppedAt, { awaitBackgroundSync: true });
    } catch (error) {
      logger.warn("session-orphan-recovery-stop-failed", { error });
      if (getSessionState().active) {
        finalizeLocalSessionStop(state, stoppedAt);
      }
    }
  };
  mainWindow.on("closed", () => {
    stopLiveSync();
    screenshotWorker.stop();
    stopSessionPowerBlocker();
    void trackingAgent.stop();
    inputActivitySampler.stop();
    appFocusPoller.stop();
    stopAllWindowsProbeSessions();
    trackingOverlay.destroy();
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_SOUND_ENABLED_GET, () => ({
    enabled: isNotificationSoundEnabled()
  }));

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_SOUND_ENABLED_SET, (_event, enabled: unknown) => {
    setNotificationSoundEnabled(Boolean(enabled));
    return { enabled: isNotificationSoundEnabled() };
  });

  let closingAfterStop = false;

  const isTrackingSessionActiveForClose = (): boolean =>
    getSessionState().active === 1 && isActiveSessionOwnedByCurrentUser();

  mainWindow.on("close", (event) => {
    if (closingAfterStop || !isTrackingSessionActiveForClose() || !stopActiveTrackingSession) {
      return;
    }

    event.preventDefault();

    const stopSession = stopActiveTrackingSession;
    void dialog
      .showMessageBox(mainWindow, {
        type: "question",
        title: "LANDEV Tracker",
        message: "Are you sure you want to stop tracking?",
        detail: "A work session is still running. Choose Yes to stop tracking and close the app, or No to keep tracking.",
        buttons: ["Yes", "No"],
        defaultId: 1,
        cancelId: 1,
        noLink: true
      })
      .then(({ response }) => {
        if (response !== 0) {
          return;
        }

        closingAfterStop = true;
        return stopSession(new Date().toISOString())
          .catch((error) => {
            logger.warn("stop-on-window-close-failed", { error });
          })
          .finally(() => {
            if (!mainWindow.isDestroyed()) {
              mainWindow.destroy();
            }
          });
      })
      .catch((error) => {
        logger.warn("stop-tracking-close-dialog-failed", { error });
      });
  });

  ipcMain.handle(IPC_CHANNELS.APP_INFO, () => ({
    appName: app.getName(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    env: env.VITE_APP_ENV,
    apiBaseUrl: env.VITE_API_BASE_URL
  }));

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_event, url: unknown) => {
    if (typeof url !== "string" || !url.trim()) {
      throw new Error("Invalid URL");
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Invalid URL");
    }
    if (parsed.protocol !== "https:") {
      throw new Error("Only HTTPS links are allowed");
    }
    await shell.openExternal(parsed.toString());
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_TEST, async () => {
    return api.testConnection();
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_CONSENT_STATUS, () => {
    return { accepted: getSetting("trackingConsentAccepted") === "true" };
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_CONSENT_ACCEPT, () => {
    setSetting("trackingConsentAccepted", "true");
    return { accepted: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, payload) => {
    try {
      const parsed = loginSchema.parse(payload);
      saveCredentials(parsed.username, parsed.password);
      applyAccountContext(parsed.username);
      const result = await api.login(parsed, authContext());
      if (result.token) {
        saveToken(result.token);
      }
      if (result.sessionCookie) {
        saveSessionCookie(result.sessionCookie);
      }
      startLiveSync();
      void Promise.all([worker.flush(), projectSync.syncNow()]).catch((syncError) => {
        logger.warn("auth-login-post-sync-failed", { error: syncError });
      });
      const roles = result.roles.length > 0 ? result.roles : await fetchUserRoles(authContext());
      return { ok: true, roles };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => {
    try {
      const ctx = authContext();
      const probe = await api.probeSession(ctx);
      const roles = await fetchUserRoles(ctx);
      if (probe.authenticated) {
        const savedCredentials = readCredentials();
        if (savedCredentials) {
          applyAccountContext(savedCredentials.username);
        }
        startLiveSync();
      } else {
        stopLiveSync();
        finalizeAccountLogout();
      }
      return { authenticated: probe.authenticated, roles };
    } catch {
      clearToken();
      clearSessionCookie();
      clearCachedUserRoles();
      clearCredentials();
      stopLiveSync();
      finalizeAccountLogout();
      return { authenticated: false, roles: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    const stoppedAt = new Date().toISOString();
    const savedCredentials = readCredentials();
    if (savedCredentials) {
      setCurrentAppUser(savedCredentials.username);
    }
    if (getSessionState().active) {
      try {
        await performSessionStop(stoppedAt);
      } catch (error) {
        logger.warn("stop-on-logout-failed", { error });
        if (getSessionState().active) {
          finalizeLocalSessionStop(getSessionState(), stoppedAt);
        }
      }
    } else {
      stopLiveSync();
      screenshotWorker.stop();
      stopSessionPowerBlocker();
      void trackingAgent.stop();
      inputActivitySampler.stop();
      appFocusPoller.stop();
      trackingOverlay.syncVisibility();
    }
    try {
      await api.logout(authContext());
    } catch (error) {
      logger.warn("backend-logout-failed", { error });
    } finally {
      clearToken();
      clearSessionCookie();
      clearCachedUserRoles();
      clearCredentials();
      finalizeAccountLogout();
      clearProjectsCache();
      stopLiveSync();
      notifySessionStatus();
    }
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_PROJECTS, async () => {
    try {
      const result = await projectSync.syncNow();
      logger.info("projects-role-filter", {
        roles: result.roles,
        serverCount: result.serverCount,
        localCount: result.localCount,
        visibleCount: result.projects.length
      });
      return { projects: result.projects, roles: result.roles };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_STATUS, () => normalizeSessionState());

  ipcMain.handle(IPC_CHANNELS.TRACKING_RECENT_TASKS, () => getRecentWorkTasks());

  ipcMain.handle(IPC_CHANNELS.TRACKING_WORK_SUMMARY, () => {
    const state = sessionStateForCurrentUser();
    return getWorkSummary({
      projectId: state.active ? state.projectId : null,
      projectName: state.active ? getSetting("activeSessionProjectName") || null : null,
      startedAt: state.active ? state.startedAt : null
    });
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_START, async (_event, payload) => {
    let localCaptureStarted = false;
    let startTimeUtc = new Date().toISOString();

    const rollbackLocalStart = (): void => {
      sessionRemoteSync?.markLocalUserAction(90_000);
      try {
        stopTrackingCapture();
        resetActiveSessionState();
        clearActiveSessionProjectName();
        clearActiveSessionOwner();
        setSetting("activeSessionIsNonChargeable", "false");
        stopSessionPowerBlocker();
        sendSessionStatus(mainWindow, trackingOverlay);
      } catch {
        // Best-effort cleanup only.
      }
    };

    const persistStartedSession = (input: {
      sessionId: string | null;
      projectId: string;
      description: string;
      startedAt: string;
    }): void => {
      saveSessionState({
        active: 1,
        sessionId: input.sessionId,
        projectId: input.projectId,
        description: input.description,
        startedAt: input.startedAt
      });
      if (hasUsableWorkSessionId(input.sessionId)) {
        const backfilledEvents = backfillWorkSessionIdOnPendingEvents(input.sessionId!);
        const backfilledScreenshots = backfillWorkSessionIdOnPendingScreenshots(input.sessionId!);
        if (backfilledEvents > 0 || backfilledScreenshots > 0) {
          logger.info("pending-work-session-backfill", {
            sessionId: input.sessionId,
            backfilledEvents,
            backfilledScreenshots
          });
        }
      }
      void worker.flush();
      logger.info("tracking-session-started-local", {
        sessionId: input.sessionId,
        startedAt: input.startedAt,
        hasWorkSessionId: hasUsableWorkSessionId(input.sessionId)
      });
    };

    const requestRemoteSessionStart = async (
      parsed: z.infer<typeof startSchema>,
      clockStartUtc: string
    ): Promise<{ sessionId: string | null }> => {
      const result = await api.startSession(
        {
          projectId: parsed.projectId,
          projectName: parsed.projectName,
          isNonChargeable: parsed.isNonChargeable,
          description: parsed.description,
          clientTimeZone: getClientIanaTimeZone(),
          startTimeUtc: clockStartUtc
        },
        authContext()
      );
      let sessionId = result.sessionId;
      if (!hasUsableWorkSessionId(sessionId)) {
        sessionId = await api.fetchActiveWorkSessionId(authContext());
      }
      return { sessionId: sessionId ?? null };
    };

    try {
      sessionRemoteSync?.markLocalUserAction();
      const parsed = startSchema.parse(enrichSessionStartPayload(payload));
      const currentState = getSessionState();
      const ctx = authContext();

      if (!readToken() && !readSessionCookie()) {
        throw new Error("AUTH: Not authenticated");
      }
      if (getSetting("trackingConsentAccepted") !== "true") {
        throw new Error("VALIDATION: Accept tracking terms before starting.");
      }
      if (currentState.active) throw new Error("VALIDATION: Session already running.");

      const catalogProject = isCatalogProjectId(parsed.projectId);
      logger.info("tracking-start-validated", {
        hasProjectId: !catalogProject && parsed.projectId.length > 0,
        catalogProject,
        projectName: parsed.projectName,
        descriptionLength: parsed.description.length
      });
      startTimeUtc = new Date().toISOString();
      const userKey = getCurrentAppUserKey();
      if (userKey) {
        setActiveSessionOwnerKey(userKey);
      }

      try {
        const closedOrphan = await resolveAndCloseStaleRemoteSession(ctx);
        if (closedOrphan) {
          logger.info("tracking-start-preclosed-orphan-remote-session");
        }
      } catch (error) {
        logger.warn("tracking-start-preclose-orphan-failed", { error });
      }

      await startLocalCapture({
        projectId: parsed.projectId,
        projectName: (parsed.projectName ?? parsed.projectId).trim(),
        description: parsed.description,
        startedAt: startTimeUtc,
        sessionId: null,
        isNonChargeable: parsed.isNonChargeable ?? catalogProject
      });
      localCaptureStarted = true;
      sendSessionStatus(mainWindow, trackingOverlay);

      let remoteStart: { sessionId: string | null };
      try {
        remoteStart = await requestRemoteSessionStart(parsed, startTimeUtc);
      } catch (error) {
        if (isActiveSessionStartConflictError(error)) {
          logger.warn("tracking-start-conflict-reconciling", {
            message: error instanceof Error ? error.message : "unknown"
          });
          try {
            await reconcileActiveSessionStartConflict(ctx);
            remoteStart = await requestRemoteSessionStart(parsed, startTimeUtc);
          } catch (retryError) {
            if (retryError instanceof api.ApiError && retryError.kind === "network") {
              persistStartedSession({
                sessionId: null,
                projectId: parsed.projectId,
                description: parsed.description,
                startedAt: startTimeUtc
              });
              logger.warn("tracking-start-remote-deferred-offline", {
                reason: "conflict-reconcile-offline"
              });
              return { sessionId: null };
            }
            throw retryError;
          }
        } else if (error instanceof api.ApiError && error.kind === "network") {
          persistStartedSession({
            sessionId: null,
            projectId: parsed.projectId,
            description: parsed.description,
            startedAt: startTimeUtc
          });
          logger.warn("tracking-start-remote-deferred-offline", {
            message: error.message
          });
          return { sessionId: null };
        } else {
          throw error;
        }
      }

      persistStartedSession({
        sessionId: remoteStart.sessionId,
        projectId: parsed.projectId,
        description: parsed.description,
        startedAt: startTimeUtc
      });
      return { sessionId: remoteStart.sessionId };
    } catch (error) {
      if (localCaptureStarted) {
        rollbackLocalStart();
      }
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_EVENT, async () => {
    return { queued: false, deprecated: true };
  });

  const finalizeLocalSessionStop = (
    state: ReturnType<typeof getSessionState>,
    stoppedAt: string,
    stopReason: api.SessionStopReason = "USER"
  ): void => {
    if (state.projectId && state.startedAt) {
      recordCompletedWorkSession({
        projectId: state.projectId,
        projectName: getSetting("activeSessionProjectName") ?? state.projectId,
        description: state.description ?? "",
        isNonChargeable: getSetting("activeSessionIsNonChargeable") === "true",
        startedAt: state.startedAt,
        stoppedAt,
        stopReason
      });
    }
    clearActiveSessionProjectName();
    clearActiveSessionOwner();
    setSetting("activeSessionIsNonChargeable", "false");
    saveSessionState({
      active: 0,
      sessionId: null,
      projectId: null,
      description: null,
      startedAt: null
    });
    stopSessionPowerBlocker();
    sendSessionStatus(mainWindow, trackingOverlay);
  };

  type SessionStopOptions = {
    stopReason?: api.SessionStopReason;
    awaitBackgroundSync?: boolean;
  };

  const performSessionStop = async (
    stoppedAt: string,
    options: SessionStopOptions = {}
  ): Promise<api.SessionStopResult> => {
    const stopReason = options.stopReason ?? "USER";
    sessionRemoteSync?.markLocalUserAction();

    let state = getSessionState();

    if (!readToken() && !readSessionCookie()) {
      throw new Error("VALIDATION: No active session to stop.");
    }

    if (!state.active) {
      stopTrackingCapture();
      sendSessionStatus(mainWindow, trackingOverlay);
      return {
        ok: true as const,
        queued: false,
        endpointPath: "/api/tracking/session/stop",
        status: null,
        confirmedBy: "idempotent" as const,
        sessionId: state.sessionId,
        timesheetId: null,
        responsePreview: null
      };
    }

    if (!hasUsableWorkSessionId(state.sessionId)) {
      try {
        const resolved = await api.fetchActiveWorkSessionId(authContext());
        if (hasUsableWorkSessionId(resolved)) {
          saveSessionState({
            active: state.active,
            sessionId: resolved,
            projectId: state.projectId,
            description: state.description,
            startedAt: state.startedAt
          });
          state = getSessionState();
        }
      } catch (error) {
        logger.warn("tracking-stop-session-id-resolve-failed", { error });
      }
    }

    const stopPayload = buildSessionStopInput(state, stoppedAt, {
      stopReason
    });

    logger.info("tracking-stop-flow-start", {
      localSessionId: state.sessionId,
      stoppedAt: stopPayload.stoppedAt,
      startedAt: stopPayload.startedAt ?? null,
      durationMs: stopPayload.durationMs ?? null,
      workDateKey: stopPayload.workDateKey ?? null,
      hasTrailingEvents: Boolean(stopPayload.trailingEvents?.length),
      deviceUuid: stopPayload.deviceUuid ?? null,
      stopReason
    });

    // Stop locally first, then sync to the server in the background.
    try {
      logger.info("tracking-stop-followup", { step: "flush-and-finalize-immediately" });
      await inputActivitySampler.flushPendingSample();
      await appFocusPoller.flushPending();
      await flushPendingActivityIntervals();
      await trackingAgent.stop(stopReason);
      stopTrackingCapture();
      const clearedAfterStop = clearSyntheticSessionPendingEvents();
      if (clearedAfterStop > 0) {
        logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedAfterStop, reason: "after-stop" });
      }
    } catch (error) {
      logger.warn("tracking-stop-local-cleanup-failed", { error });
    } finally {
      if (getSessionState().active) {
        finalizeLocalSessionStop(state, stoppedAt, stopReason);
      }
    }

    const runBackgroundSync = async (): Promise<void> => {
      try {
        logger.info("tracking-stop-followup", { step: "remote-stop-background" });
        const stopResult = await api.stopSession(stopPayload, {
          ...authContext(),
          onAuthRefresh: refreshAuthSession
        });
        logger.info("tracking-stop-flow-result", stopResult);
      } catch (error) {
        logger.warn("tracking-stop-remote-failed", { error });
      }
      try {
        await worker.flush();
      } catch (error) {
        logger.warn("tracking-stop-background-sync-failed", { error });
      }
    };

    if (options.awaitBackgroundSync) {
      await runBackgroundSync();
    } else {
      void runBackgroundSync();
    }

    return {
      ok: true as const,
      queued: true,
      endpointPath: "/api/tracking/session/stop",
      status: null,
      confirmedBy: "idempotent" as const,
      sessionId: state.sessionId,
      timesheetId: null,
      responsePreview: null
    };
  };

  stopActiveTrackingSession = (stoppedAt) => performSessionStop(stoppedAt);

  const startLocalCapture = async (input: {
    projectId: string;
    projectName: string;
    description: string;
    startedAt: string;
    sessionId: string | null;
    isNonChargeable: boolean;
  }): Promise<void> => {
    const userKey = getCurrentAppUserKey();
    if (userKey) {
      setActiveSessionOwnerKey(userKey);
    }

    saveSessionState({
      active: 1,
      sessionId: input.sessionId,
      projectId: input.projectId,
      description: input.description,
      startedAt: input.startedAt
    });
    clearAppFocusDedupeState();
    clearEngagementPersistenceState();
    clearInputActivityRollup();
    clearActivityIntervalTracker();
    startSessionPowerBlocker();
    await resetAndWarmUpWindowsProbes();
    await screenshotWorker.start({
      projectId: isCatalogProjectId(input.projectId) ? null : input.projectId,
      sessionId: input.sessionId
    });
    await trackingAgent.start();
    inputActivitySampler.start();
    appFocusPoller.start();
    setActiveSessionProjectName(input.projectName);
    setSetting("activeSessionIsNonChargeable", input.isNonChargeable ? "true" : "false");
    void worker.flush();
  };

  sessionRemoteSync = new SessionRemoteSyncService(mainWindow, {
    getLocalState: () => {
      const state = normalizeSessionState();
      return {
        active: state.active,
        sessionId: state.sessionId,
        startedAt: state.startedAt
      };
    },
    mirrorStart: async (remote) => {
      if (getSessionState().active) {
        return;
      }
      if (getSetting("trackingConsentAccepted") !== "true") {
        return;
      }
      const project = resolveRemoteProject(remote);
      if (!project) {
        logger.warn("session-remote-sync-mirror-start-skipped", { reason: "missing-project" });
        return;
      }
      const mirrorNowMs = Date.now();
      const startedAt = resolveMirroredSessionStartedAt(
        remote.startedAt ?? new Date(mirrorNowMs).toISOString(),
        project.projectId,
        mirrorNowMs
      );
      await startLocalCapture({
        projectId: project.projectId,
        projectName: project.projectName,
        description: remote.description?.trim() || "Web session",
        startedAt,
        sessionId: hasUsableWorkSessionId(remote.sessionId) ? remote.sessionId : null,
        isNonChargeable: project.isNonChargeable
      });
    },
    updateSessionId: (sessionId) => {
      const state = getSessionState();
      if (!state.active || !hasUsableWorkSessionId(sessionId)) {
        return;
      }
      saveSessionState({
        active: state.active,
        sessionId,
        projectId: state.projectId,
        description: state.description,
        startedAt: state.startedAt
      });
      const backfilledEvents = backfillWorkSessionIdOnPendingEvents(sessionId);
      const backfilledScreenshots = backfillWorkSessionIdOnPendingScreenshots(sessionId);
      if (backfilledEvents > 0 || backfilledScreenshots > 0) {
        logger.info("pending-work-session-backfill", {
          sessionId,
          backfilledEvents,
          backfilledScreenshots
        });
      }
      void worker.flush();
    },
    notifyStatus: notifySessionStatus
  });

  if (isAuthenticated()) {
    startLiveSync();
    void projectSync.syncNow();
  }

  void recoverOrphanedActiveSessionOnBoot();

  ipcMain.handle(IPC_CHANNELS.SESSION_STOP, async (_event, payload) => {
    try {
      const parsed = stopSchema.parse(payload);
      return await performSessionStop(parsed.stoppedAt);
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_SYNC_STATUS, () => worker.getStatus());
  ipcMain.handle(IPC_CHANNELS.TRACKING_DEBUG_LAST_EVENTS, () => trackingDiagnostics.snapshot(200));

  ipcMain.handle(IPC_CHANNELS.SYNC_NOW, async () => {
    try {
      await projectSync.syncNow();
      const status = await worker.flush();
      return { ok: true, status };
    } catch (error) {
      logger.error("sync-now-failed", { error });
      throw asUserError(error);
    }
  });
}
