import { BrowserWindow, dialog, ipcMain, app, shell, powerMonitor } from "electron";
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
import { clearApiSessionCookies } from "../security/api-session-cookies";
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
  setActiveSessionProjectName
} from "../db/work-log";
import { TrackingOverlayManager } from "../services/tracking-overlay";
import {
  isActiveSessionStartConflictError,
  resolveAndCloseStaleRemoteSession,
  reconcileActiveSessionStartConflict
} from "../services/session-start-reconcile";
import { syncPendingRemoteSessionStart } from "../services/session-remote-start-sync";

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

function sendSessionStartFailed(mainWindow: BrowserWindow, message: string): void {
  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send("tracking:start-failed", { message });
  }
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
    }
    // Periodic sync is now cheap (version check + incremental delta), so it runs
    // even during an active session to surface newly assigned projects quickly.
  });

  const startLiveSync = (): void => {
    worker.start();
    projectSync.start();
  };

  const stopLiveSync = (): void => {
    projectSync.stop();
    worker.stop();
  };

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
    },
    getSystemIdleMs: () => powerMonitor.getSystemIdleTime() * 1000
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
      await Promise.all([
        worker.flush(),
        projectSync.syncNow()
      ]).catch((syncError) => {
        logger.warn("auth-login-post-sync-failed", { error: syncError });
      });
      const roles = result.roles.length > 0 ? result.roles : await fetchUserRoles(authContext());
      return { ok: true, roles };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => {
    if (!isAuthenticated()) {
      stopLiveSync();
      return { authenticated: false, roles: [] };
    }

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
      await clearApiSessionCookies();
      stopLiveSync();
      finalizeAccountLogout();
      return { authenticated: false, roles: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    const stoppedAt = new Date().toISOString();
    const sessionAtLogout = getSessionState();
    const authAtLogout = authContext();

    stopLiveSync();

    try {
      if (sessionAtLogout.active) {
        stopTrackingCapture();
        void trackingAgent.stop("USER");
        finalizeLocalSessionStop(sessionAtLogout, stoppedAt, "USER");
      } else {
        stopTrackingCapture();
        void trackingAgent.stop();
        stopSessionPowerBlocker();
        trackingOverlay.syncVisibility();
      }
    } catch (error) {
      logger.warn("logout-local-stop-failed", { error });
    }

    finalizeAccountLogout();
    clearProjectsCache();
    clearToken();
    clearSessionCookie();
    clearCachedUserRoles();
    clearCredentials();
    await clearApiSessionCookies();
    notifySessionStatus();

    void (async () => {
      if (sessionAtLogout.active && (authAtLogout.token || authAtLogout.sessionCookie)) {
        try {
          const stopPayload = buildSessionStopInput(sessionAtLogout, stoppedAt, {
            stopReason: "USER"
          });
          await api.stopSession(stopPayload, {
            ...authAtLogout,
            onAuthRefresh: async () => null
          });
        } catch (error) {
          logger.warn("logout-remote-session-stop-failed", { error });
        }
      }
      try {
        await api.logout(authAtLogout);
      } catch (error) {
        logger.warn("backend-logout-failed", { error });
      }
    })();

    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_PROJECTS, async () => {
    try {
      const result = projectSync.getCached();
      logger.info("projects-role-filter", {
        roles: result.roles,
        serverCount: result.serverCount,
        localCount: result.localCount,
        visibleCount: result.projects.length,
        source: "cache"
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

    const finalizeSessionStartInBackground = async (
      parsed: z.infer<typeof startSchema>,
      clockStartUtc: string
    ): Promise<void> => {
      const ctx = authContext();
      try {
        try {
          const closedOrphan = await resolveAndCloseStaleRemoteSession(ctx);
          if (closedOrphan) {
            logger.info("tracking-start-preclosed-orphan-remote-session");
          }
        } catch (error) {
          logger.warn("tracking-start-preclose-orphan-failed", { error });
        }

        if (!getSessionState().active || getSessionState().startedAt !== clockStartUtc) {
          logger.info("tracking-start-background-aborted", { reason: "session-no-longer-active" });
          return;
        }

        await startLocalCaptureHeavy();

        if (!getSessionState().active || getSessionState().startedAt !== clockStartUtc) {
          logger.info("tracking-start-background-aborted", { reason: "stopped-during-warmup" });
          return;
        }

        let remoteStart: { sessionId: string | null };
        try {
          remoteStart = await requestRemoteSessionStart(parsed, clockStartUtc);
        } catch (error) {
          if (isActiveSessionStartConflictError(error)) {
            logger.warn("tracking-start-conflict-reconciling", {
              message: error instanceof Error ? error.message : "unknown"
            });
            try {
              await reconcileActiveSessionStartConflict(ctx);
              remoteStart = await requestRemoteSessionStart(parsed, clockStartUtc);
            } catch (retryError) {
              if (retryError instanceof api.ApiError && retryError.kind === "network") {
                persistStartedSession({
                  sessionId: null,
                  projectId: parsed.projectId,
                  description: parsed.description,
                  startedAt: clockStartUtc
                });
                logger.warn("tracking-start-remote-deferred-offline", {
                  reason: "conflict-reconcile-offline"
                });
                return;
              }
              throw retryError;
            }
          } else if (error instanceof api.ApiError && error.kind === "network") {
            persistStartedSession({
              sessionId: null,
              projectId: parsed.projectId,
              description: parsed.description,
              startedAt: clockStartUtc
            });
            logger.warn("tracking-start-remote-deferred-offline", {
              message: error.message
            });
            return;
          } else {
            throw error;
          }
        }

        if (!getSessionState().active || getSessionState().startedAt !== clockStartUtc) {
          logger.info("tracking-start-background-aborted", { reason: "stopped-before-persist" });
          return;
        }

        persistStartedSession({
          sessionId: remoteStart.sessionId,
          projectId: parsed.projectId,
          description: parsed.description,
          startedAt: clockStartUtc
        });
        sendSessionStatus(mainWindow, trackingOverlay);
      } catch (error) {
        logger.warn("tracking-start-background-failed", { error });
        rollbackLocalStart();
        sendSessionStartFailed(mainWindow, asUserError(error).message);
      } finally {
        sessionStartFinalizePromise = null;
      }
    };

    try {
      const parsed = startSchema.parse(enrichSessionStartPayload(payload));
      const currentState = getSessionState();

      if (!readToken() && !readSessionCookie()) {
        throw new Error("AUTH: Not authenticated");
      }
      if (getSetting("trackingConsentAccepted") !== "true") {
        throw new Error("VALIDATION: Accept tracking terms before starting.");
      }
      if (currentState.active) {
        throw new Error("VALIDATION: Session already running.");
      }
      if (sessionStartFinalizePromise) {
        throw new Error("VALIDATION: Session start already in progress.");
      }

      const catalogProject = isCatalogProjectId(parsed.projectId);
      logger.info("tracking-start-validated", {
        hasProjectId: !catalogProject && parsed.projectId.length > 0,
        catalogProject,
        projectName: parsed.projectName,
        descriptionLength: parsed.description.length
      });
      startTimeUtc = new Date().toISOString();

      await startLocalCaptureFast({
        projectId: parsed.projectId,
        projectName: (parsed.projectName ?? parsed.projectId).trim(),
        description: parsed.description,
        startedAt: startTimeUtc,
        sessionId: null,
        isNonChargeable: parsed.isNonChargeable ?? catalogProject
      });
      localCaptureStarted = true;
      sendSessionStatus(mainWindow, trackingOverlay);

      sessionStartFinalizePromise = finalizeSessionStartInBackground(parsed, startTimeUtc);
      void sessionStartFinalizePromise;

      return { sessionId: getSessionState().sessionId };
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

    const endState = { ...state };
    const stopPayload = buildSessionStopInput(endState, stoppedAt, {
      stopReason
    });

    logger.info("tracking-stop-flow-start", {
      localSessionId: endState.sessionId,
      stoppedAt: stopPayload.stoppedAt,
      startedAt: stopPayload.startedAt ?? null,
      durationMs: stopPayload.durationMs ?? null,
      workDateKey: stopPayload.workDateKey ?? null,
      hasTrailingEvents: Boolean(stopPayload.trailingEvents?.length),
      deviceUuid: stopPayload.deviceUuid ?? null,
      stopReason
    });

    finalizeLocalSessionStop(endState, stoppedAt, stopReason);
    stopTrackingCapture();
    const clearedAfterStop = clearSyntheticSessionPendingEvents();
    if (clearedAfterStop > 0) {
      logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedAfterStop, reason: "after-stop" });
    }

    const runBackgroundSync = async (): Promise<void> => {
      try {
        logger.info("tracking-stop-followup", { step: "flush-and-remote-stop-background" });
        await Promise.allSettled([
          inputActivitySampler.flushPendingSample(endState),
          appFocusPoller.flushPending(endState),
          flushPendingActivityIntervals(),
          trackingAgent.stop(stopReason)
        ]);
      } catch (error) {
        logger.warn("tracking-stop-local-cleanup-failed", { error });
      }

      try {
        let remoteStopPayload = stopPayload;
        if (!hasUsableWorkSessionId(remoteStopPayload.sessionId)) {
          try {
            const resolved = await api.fetchActiveWorkSessionId(authContext());
            if (hasUsableWorkSessionId(resolved)) {
              remoteStopPayload = { ...remoteStopPayload, sessionId: resolved };
            }
          } catch (error) {
            logger.warn("tracking-stop-session-id-resolve-failed", { error });
          }
        }

        const stopResult = await api.stopSession(remoteStopPayload, {
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
      sessionId: endState.sessionId,
      timesheetId: null,
      responsePreview: null
    };
  };

  stopActiveTrackingSession = (stoppedAt) => performSessionStop(stoppedAt);

  const startLocalCaptureFast = async (input: {
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
    await screenshotWorker.start({
      projectId: isCatalogProjectId(input.projectId) ? null : input.projectId,
      sessionId: input.sessionId
    });
    inputActivitySampler.start();
    appFocusPoller.start();
    setActiveSessionProjectName(input.projectName);
    setSetting("activeSessionIsNonChargeable", input.isNonChargeable ? "true" : "false");
    void worker.flush();
  };

  const startLocalCaptureHeavy = async (): Promise<void> => {
    void resetAndWarmUpWindowsProbes();
    await trackingAgent.start();
  };

  const startLocalCapture = async (input: {
    projectId: string;
    projectName: string;
    description: string;
    startedAt: string;
    sessionId: string | null;
    isNonChargeable: boolean;
  }): Promise<void> => {
    await startLocalCaptureFast(input);
    await startLocalCaptureHeavy();
  };

  let sessionStartFinalizePromise: Promise<void> | null = null;

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
      const projectResult = await projectSync.syncNow();
      const status = await worker.flush();
      return { ok: true, status, projectsSkipped: projectResult.skipped === true };
    } catch (error) {
      logger.error("sync-now-failed", { error });
      throw asUserError(error);
    }
  });
}
