import { BrowserWindow, dialog, ipcMain, app, shell } from "electron";
import { startSessionPowerBlocker, stopSessionPowerBlocker } from "../services/session-power";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { IPC_CHANNELS } from "./channels";
import { eventSchema, loginSchema, startSchema, stopSchema } from "./schemas";
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
  clearSyntheticSessionPendingEvents,
  clearUndeliveredQueuedEvents,
  getSessionState,
  getSetting,
  resetActiveSessionState,
  saveSessionState,
  setSetting
} from "../db/queue-repo";
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
import { AppFocusPoller } from "../services/app-focus-poller";
import { InputActivitySampler } from "../services/input-activity-sampler";
import {
  resetAndWarmUpWindowsProbes,
  stopAllWindowsProbeSessions
} from "../services/probe-session-lifecycle";
import { SessionReminderService } from "../services/session-reminder";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled
} from "../services/notification-settings";
import { recordInputActivityEvent } from "../services/tracking-input-activity";
import { clearAppFocusDedupeState } from "../services/tracking-app-focus";
import { clearInputActivityRollup } from "../services/input-activity-rollup";
import {
  clearLocalNotificationUnreadCount,
  getLocalNotificationUnreadCount,
  getMergedNotificationUnreadCount,
  mergeNotificationUnreadCount,
  publishNotificationCount,
  registerNotificationBadgeWindow,
  clearNotificationBadgeWindow,
  setLastRemoteNotificationUnreadCount
} from "../services/notification-badge";
import { hasUsableWorkSessionId } from "../services/session-event-fields";
import { buildSessionStopInput } from "../services/session-stop-payload";
import { registerSessionPowerLifecycle } from "../services/session-power-lifecycle";
import {
  DESIGNER_PROJECT_NAMES,
  isCatalogProjectId,
  isModeratorRole,
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

let stopActiveTrackingSession: ((stoppedAt: string) => Promise<api.SessionStopResult>) | null = null;

export async function stopActiveSessionIfRunning(): Promise<boolean> {
  if (!getSessionState().active || !stopActiveTrackingSession) {
    return false;
  }
  try {
    await stopActiveTrackingSession(new Date().toISOString());
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

function sendSessionStatus(mainWindow: BrowserWindow, overlay?: TrackingOverlayManager): void {
  mainWindow.webContents.send("tracking:status-push", normalizeSessionState());
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
  if (value == null) return 0;
  return Math.min(MAX_PER_EVENT_SECONDS, Math.max(0, value));
}

export function registerIpc(mainWindow: BrowserWindow): void {
  registerNotificationBadgeWindow(mainWindow);
  const env = readEnv();
  const electronDir = path.dirname(fileURLToPath(import.meta.url));
  const preloadPath = path.join(electronDir, "preload.mjs");
  const rendererIndex = path.join(process.env.APP_ROOT ?? app.getAppPath(), "dist", "index.html");
  const overlayUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?view=overlay`
    : `${pathToFileURL(rendererIndex).href}?view=overlay`;
  const trackingOverlay = new TrackingOverlayManager({
    preloadPath,
    overlayUrl
  });
  const worker = new SyncWorker({
    window: mainWindow,
    onSyncResult: (result) => trackingDiagnostics.recordSync(result.ok, result.statusCode, result.message)
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
  });

  const startLiveSync = (): void => {
    projectSync.start();
    worker.start();
  };

  const stopLiveSync = (): void => {
    projectSync.stop();
    worker.stop();
  };

  if (isAuthenticated()) {
    startLiveSync();
    void projectSync.syncNow();
  }
  const clearedOnBoot = clearSyntheticSessionPendingEvents();
  if (clearedOnBoot > 0) {
    logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedOnBoot });
  }
  const screenshotWorker = new ScreenshotWorker({
    uploadScreenshot: async (payload) => {
      await api.ingestScreenshot(payload, authContext());
    }
  });
  const appFocusPoller = new AppFocusPoller();
  const inputActivitySampler = new InputActivitySampler();
  const sessionReminder = new SessionReminderService();

  const stopTrackingCapture = (): void => {
    appFocusPoller.stop();
    inputActivitySampler.stop();
    screenshotWorker.stop();
    sessionReminder.stop();
    stopAllWindowsProbeSessions();
    clearAppFocusDedupeState();
    clearInputActivityRollup();
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
    clearLocalNotificationUnreadCount();
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

    const stoppedAt = new Date().toISOString();
    logger.info("session-orphan-recovery-stop", {
      sessionId: state.sessionId,
      startedAt: state.startedAt,
      stoppedAt
    });

    try {
      await performSessionStop(stoppedAt);
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
    appFocusPoller.stop();
    inputActivitySampler.stop();
    stopAllWindowsProbeSessions();
    sessionReminder.stop();
    trackingOverlay.destroy();
    clearNotificationBadgeWindow();
  });

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_SOUND_ENABLED_GET, () => ({
    enabled: isNotificationSoundEnabled()
  }));

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_SOUND_ENABLED_SET, (_event, enabled: unknown) => {
    setNotificationSoundEnabled(Boolean(enabled));
    return { enabled: isNotificationSoundEnabled() };
  });

  ipcMain.handle(IPC_CHANNELS.WEB_NOTIFICATIONS_STATUS, async () => {
    try {
      const remote = await api.fetchWebNotificationRemoteCount({
        ...authContext(),
        onAuthRefresh: refreshAuthSession
      });
      setLastRemoteNotificationUnreadCount(remote);
      const unreadCount = mergeNotificationUnreadCount(remote);
      publishNotificationCount(unreadCount);
      return { unreadCount };
    } catch (error) {
      logger.warn("web-notifications-status-failed", { error });
      const unreadCount = getMergedNotificationUnreadCount();
      return { unreadCount };
    }
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
      await Promise.all([worker.flush(), projectSync.syncNow()]);
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
      appFocusPoller.stop();
      inputActivitySampler.stop();
      sessionReminder.stop();
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
    try {
      const parsed = startSchema.parse(payload);
      const currentState = getSessionState();

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
      const startTimeUtc = new Date().toISOString();
      const userKey = getCurrentAppUserKey();
      if (userKey) {
        setActiveSessionOwnerKey(userKey);
      }

      // Start tracking locally immediately (do not wait for the remote session id),
      // so the timer and "worked today" update feel instant.
      saveSessionState({
        active: 1,
        sessionId: null,
        projectId: parsed.projectId,
        description: parsed.description,
        startedAt: startTimeUtc
      });
    clearAppFocusDedupeState();
    clearInputActivityRollup();
    startSessionPowerBlocker();
      await resetAndWarmUpWindowsProbes();
      await screenshotWorker.start({
        projectId: catalogProject ? null : parsed.projectId,
        sessionId: null
      });
      appFocusPoller.start();
      inputActivitySampler.start();
      sessionReminder.start();

      setActiveSessionProjectName((parsed.projectName ?? parsed.projectId).trim());
      setSetting("activeSessionIsNonChargeable", parsed.isNonChargeable ? "true" : "false");

      sendSessionStatus(mainWindow, trackingOverlay);

      // Remote start can be slower; update the session id once it is known.
      const result = await api.startSession(
        {
          projectId: parsed.projectId,
          projectName: parsed.projectName,
          isNonChargeable: parsed.isNonChargeable,
          description: parsed.description,
          clientTimeZone: getClientIanaTimeZone(),
          startTimeUtc
        },
        authContext()
      );
      let sessionId = result.sessionId;
      if (!hasUsableWorkSessionId(sessionId)) {
        sessionId = await api.fetchActiveWorkSessionId(authContext());
      }

      saveSessionState({
        active: 1,
        sessionId: sessionId ?? null,
        projectId: parsed.projectId,
        description: parsed.description,
        startedAt: startTimeUtc
      });

      void worker.flush();
      logger.info("tracking-session-started-local", {
        sessionId: sessionId ?? null,
        startedAt: startTimeUtc,
        hasWorkSessionId: hasUsableWorkSessionId(sessionId)
      });
      return { sessionId: sessionId ?? null };
    } catch (error) {
      // If remote start fails after we already started local tracking, immediately stop everything.
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
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_EVENT, async (_event, payload) => {
    try {
      const parsed = eventSchema.parse(payload);
      if (!getSessionState().active) {
        return { queued: false };
      }
      const metadataInput = parsed.metadata ?? {};
      const mouseMoveCount = Math.max(0, Math.floor(toFiniteNumber(metadataInput.mouseMoveCount) ?? 0));
      const keyPressCount = Math.max(0, Math.floor(toFiniteNumber(metadataInput.keyPressCount) ?? 0));
      const activeSeconds = clampSeconds(toFiniteNumber(metadataInput.activeSeconds));
      const idleSeconds = clampSeconds(toFiniteNumber(metadataInput.idleSeconds));
      const queued = await recordInputActivityEvent({
        mouseMoveCount,
        keyPressCount,
        clickCount: Math.max(0, Math.floor(toFiniteNumber(metadataInput.clickCount) ?? 0)),
        activeSeconds,
        idleSeconds,
        trackerElapsedMs: Number(metadataInput.trackerElapsedMs ?? activeSeconds * 1000),
        mouseMovePercent: typeof metadataInput.mouseMovePercent === "number" ? metadataInput.mouseMovePercent : undefined,
        mouseMoveSamples: typeof metadataInput.mouseMoveSamples === "number" ? metadataInput.mouseMoveSamples : undefined,
        totalSamples: typeof metadataInput.totalSamples === "number" ? metadataInput.totalSamples : undefined,
        triggerType: typeof metadataInput.triggerType === "string" ? metadataInput.triggerType : "renderer"
      });

      return { queued, deduped: !queued };
    } catch (error) {
      throw asUserError(error);
    }
  });

  const finalizeLocalSessionStop = (state: ReturnType<typeof getSessionState>, stoppedAt: string): void => {
    if (state.projectId && state.startedAt) {
      recordCompletedWorkSession({
        projectId: state.projectId,
        projectName: getSetting("activeSessionProjectName") ?? state.projectId,
        description: state.description ?? "",
        isNonChargeable: getSetting("activeSessionIsNonChargeable") === "true",
        startedAt: state.startedAt,
        stoppedAt
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

  const performSessionStop = async (stoppedAt: string): Promise<api.SessionStopResult> => {
    const state = getSessionState();

    if ((!readToken() && !readSessionCookie()) || !state.active) {
      throw new Error("VALIDATION: No active session to stop.");
    }

    const stopPayload = buildSessionStopInput(state, stoppedAt);

    logger.info("tracking-stop-flow-start", {
      localSessionId: state.sessionId,
      stoppedAt: stopPayload.stoppedAt,
      startedAt: stopPayload.startedAt ?? null,
      durationMs: stopPayload.durationMs ?? null,
      workDateKey: stopPayload.workDateKey ?? null,
      hasTrailingEvents: Boolean(stopPayload.trailingEvents?.length),
      deviceUuid: stopPayload.deviceUuid ?? null
    });

    // Stop locally first, then sync to the server in the background.
    try {
      logger.info("tracking-stop-followup", { step: "flush-and-finalize-immediately" });
      await appFocusPoller.flushPending();
      stopTrackingCapture();
      const clearedAfterStop = clearSyntheticSessionPendingEvents();
      if (clearedAfterStop > 0) {
        logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedAfterStop, reason: "after-stop" });
      }
    } catch (error) {
      logger.warn("tracking-stop-local-cleanup-failed", { error });
    } finally {
      if (getSessionState().active) {
        finalizeLocalSessionStop(state, stoppedAt);
      }
    }

    void (async () => {
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
    })();

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

  stopActiveTrackingSession = performSessionStop;
  registerSessionPowerLifecycle(performSessionStop);
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
