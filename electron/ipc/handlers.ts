import { BrowserWindow, ipcMain, app } from "electron";
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
import { clearSyntheticSessionPendingEvents, enqueueEvent, getSessionState, getSetting, saveSessionState, setSetting } from "../db/queue-repo";
import { logger } from "../config/logger";
import { SyncWorker } from "../services/sync-worker";
import { collectActivityContext } from "../services/activity-metadata";
import { readEnv } from "../config/env";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { buildTrackingMetadata } from "../services/tracking-event-utils";
import { trackingDiagnostics } from "../services/tracking-diagnostics";
import { ScreenshotWorker } from "../services/screenshot-worker";
import { detectMeetingOrCallPresence } from "../services/meeting-detection";
import {
  DESIGNER_PROJECT_NAMES,
  isCatalogProjectId,
  isModeratorRole,
  mergeCatalogWithApi,
  MODERATOR_PROJECT_NAMES,
  resolveProjectsForRoles
} from "../config/role-project-catalog";
import { clearCachedUserRoles, fetchUserRoles, readCachedUserRoles } from "../api/client";

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
  const state = getSessionState();
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

function sendSessionStatus(mainWindow: BrowserWindow): void {
  mainWindow.webContents.send("tracking:status-push", normalizeSessionState());
}

function hasUsableSessionId(sessionId: string | null | undefined): boolean {
  if (!sessionId) return false;
  return !/^\d{13,}$/.test(sessionId.trim());
}

function authContext() {
  return {
    token: readToken() ?? undefined,
    sessionCookie: readSessionCookie() ?? undefined,
    onSessionCookie: saveSessionCookie
  };
}

const MAX_PER_EVENT_SECONDS = 300;
const MAX_LOCAL_VERIFY_EVENTS = 300;

type FocusVerifierEvent = {
  occurredAtMs: number;
  application: string;
  activeSeconds: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  return Number.isFinite(value) ? value : null;
}

function clampSeconds(value: number | null): number {
  if (value == null) return 0;
  return Math.min(MAX_PER_EVENT_SECONDS, Math.max(0, value));
}

function clampElapsedMs(value: number | null): number {
  if (value == null) return 0;
  return Math.min(MAX_PER_EVENT_SECONDS * 1000, Math.max(0, value));
}

export function registerIpc(mainWindow: BrowserWindow): void {
  const env = readEnv();
  const worker = new SyncWorker({
    readToken,
    readSessionCookie,
    window: mainWindow,
    onSyncResult: (result) => trackingDiagnostics.recordSync(result.ok, result.statusCode, result.message)
  });
  const clearedOnBoot = clearSyntheticSessionPendingEvents();
  if (clearedOnBoot > 0) {
    logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedOnBoot });
  }
  if (getSessionState().active) {
    worker.start();
  }
  const screenshotWorker = new ScreenshotWorker({
    uploadScreenshot: async (payload) => {
      await api.ingestScreenshot(payload, authContext());
    }
  });
  if (getSessionState().active) {
    screenshotWorker.start({
      projectId: getSessionState().projectId,
      sessionId: getSessionState().sessionId
    }).catch(() => undefined);
  }
  const recentAppFocusSignatures = new Map<string, number>();
  const localVerifierEvents: FocusVerifierEvent[] = [];

  mainWindow.on("closed", () => {
    worker.stop();
    screenshotWorker.stop();
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
      const result = await api.login(parsed, authContext());
      if (result.token) {
        saveToken(result.token);
      }
      if (result.sessionCookie) {
        saveSessionCookie(result.sessionCookie);
      }
      await worker.flush();
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
      return { authenticated: probe.authenticated, roles };
    } catch {
      clearToken();
      clearSessionCookie();
      clearCachedUserRoles();
      return { authenticated: false, roles: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    worker.stop();
    screenshotWorker.stop();
    try {
      await api.logout(authContext());
    } catch (error) {
      logger.warn("backend-logout-failed", { error });
    } finally {
      clearToken();
      clearSessionCookie();
      clearCachedUserRoles();
    }
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_PROJECTS, async () => {
    try {
      const ctx = authContext();
      let apiProjects: api.Project[] = [];
      try {
        apiProjects = await api.getProjects(ctx);
      } catch (error) {
        logger.warn("projects-api-fetch-failed", {
          error: error instanceof Error ? error.message : "unknown"
        });
      }

      let roles = readCachedUserRoles();
      if (roles.length === 0) {
        roles = await api.fetchUserRoles(ctx);
      }

      let projects = resolveProjectsForRoles(apiProjects, roles);
      if (projects.length === 0) {
        projects = isModeratorRole(roles)
          ? mergeCatalogWithApi(apiProjects, MODERATOR_PROJECT_NAMES)
          : mergeCatalogWithApi(apiProjects, DESIGNER_PROJECT_NAMES);
      }
      logger.info("projects-role-filter", {
        roles,
        apiCount: apiProjects.length,
        visibleCount: projects.length
      });
      return { projects, roles };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_STATUS, () => normalizeSessionState());

  ipcMain.handle(IPC_CHANNELS.SESSION_START, async (_event, payload) => {
    try {
      const parsed = startSchema.parse(payload);
      const currentState = getSessionState();

      if (!readToken() && !readSessionCookie()) {
        throw new Error("AUTH: Not authenticated");
      }
      if (getSetting("trackingConsentAccepted") !== "true") {
        throw new Error("VALIDATION: Accept tracking and screenshot terms before starting.");
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
      saveSessionState({
        active: 1,
        sessionId: result.sessionId ?? null,
        projectId: parsed.projectId,
        description: parsed.description,
        startedAt: new Date().toISOString()
      });
      worker.start();
      await screenshotWorker.start({
        projectId: catalogProject ? null : parsed.projectId,
        sessionId: result.sessionId ?? null
      });

      sendSessionStatus(mainWindow);
      return { sessionId: result.sessionId };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_EVENT, async (_event, payload) => {
    try {
      const parsed = eventSchema.parse(payload);
      const state = getSessionState();
      if (!state.active) return { queued: false };

      const context = await collectActivityContext();
      const built = buildTrackingMetadata({
        source: "ipc.handlers.tracking:event",
        projectId: state.projectId,
        workDescription: state.description,
        mouseMovePercent: typeof parsed.metadata?.mouseMovePercent === "number" ? parsed.metadata.mouseMovePercent : undefined,
        totalSamples: typeof parsed.metadata?.totalSamples === "number" ? parsed.metadata.totalSamples : undefined,
        mouseMoveSamples: typeof parsed.metadata?.mouseMoveSamples === "number" ? parsed.metadata.mouseMoveSamples : undefined,
        trackerElapsedMs: typeof parsed.metadata?.trackerElapsedMs === "number" ? parsed.metadata.trackerElapsedMs : undefined,
        rawApplication: context.application ?? context.appName ?? context.processName,
        rawWindowTitle: context.windowTitle ?? context.activeWindowTitle,
        processName: context.processName ?? context.appName,
        application: context.application ?? context.appName,
        windowTitle: context.windowTitle ?? context.activeWindowTitle
      });
      const metadataInput = parsed.metadata ?? {};
      const metadataRest = { ...metadataInput };
      delete metadataRest.activeSeconds;
      delete metadataRest.idleSeconds;
      delete metadataRest.trackerElapsedMs;
      let activeSeconds = clampSeconds(toFiniteNumber(metadataInput.activeSeconds));
      let idleSeconds = clampSeconds(toFiniteNumber(metadataInput.idleSeconds));
      const trackerElapsedMs = clampElapsedMs(toFiniteNumber(metadataInput.trackerElapsedMs));
      const meetingPresence =
        parsed.type === "APP_FOCUS"
          ? detectMeetingOrCallPresence(context)
          : { treatIntervalAsFullActiveWork: false as const, reason: null as string | null };
      if (parsed.type === "APP_FOCUS" && meetingPresence.treatIntervalAsFullActiveWork) {
        activeSeconds = clampSeconds(trackerElapsedMs / 1000);
        idleSeconds = 0;
        logger.info("app-focus-meeting-override", {
          reason: meetingPresence.reason,
          processName: context.processName ?? context.application,
          windowTitlePreview: (context.windowTitle ?? context.activeWindowTitle ?? "").slice(0, 80)
        });
      }
      const intervalSource = metadataInput.telemetryDerivedFrom === "renderer-interval"
        ? "incremental"
        : "derived";
      const timestampBucket = Math.floor(new Date(parsed.occurredAt).getTime() / 5000);
      if (parsed.type === "APP_FOCUS") {
        const dedupeSignature = [
          built.metadata.application,
          built.metadata.windowTitle,
          timestampBucket,
          activeSeconds.toFixed(3),
          idleSeconds.toFixed(3)
        ].join("|");
        const lastSeenMs = recentAppFocusSignatures.get(dedupeSignature);
        const nowMs = Date.now();
        if (lastSeenMs && nowMs - lastSeenMs <= 5000) {
          logger.info("app-focus-deduped", {
            signature: dedupeSignature.slice(0, 120),
            occurredAtIso: parsed.occurredAt
          });
          return { queued: false, deduped: true };
        }
        recentAppFocusSignatures.set(dedupeSignature, nowMs);
        for (const [key, value] of Array.from(recentAppFocusSignatures.entries())) {
          if (nowMs - value > 60_000) {
            recentAppFocusSignatures.delete(key);
          }
        }
      }
      const eventPayload = {
        ...(hasUsableSessionId(state.sessionId) ? { sessionId: state.sessionId } : {}),
        type: parsed.type,
        occurredAt: parsed.occurredAt,
        metadata: {
          ...metadataRest,
          ...built.metadata,
          activeSeconds,
          idleSeconds,
          trackerElapsedMs,
          ...(meetingPresence.treatIntervalAsFullActiveWork
            ? {
                meetingPresenceOverride: true,
                meetingPresenceReason: meetingPresence.reason
              }
            : {}),
          hasForegroundWindowHandle: Boolean(context.hasForegroundWindowHandle),
          windowReasonCode: context.windowReasonCode ?? null,
          ...context,
          clientTimeZone: getClientIanaTimeZone()
        }
      };

      const eventId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      trackingDiagnostics.recordCaptured(
        {
          capturedAt: parsed.occurredAt,
          eventId,
          eventType: parsed.type,
          rawApplication: built.metadata.rawApplication,
          rawWindowTitle: built.metadata.rawWindowTitle,
          processName: built.metadata.processName,
          application: built.metadata.application,
          hasWindowTitle: built.metadata.windowTitle.length > 0,
          hasForegroundWindowHandle: Boolean(context.hasForegroundWindowHandle),
          source: "ipc.handlers.tracking:event",
          windowReasonCode: context.windowReasonCode ?? null
        },
        {
          missingWindowTitle: built.missingWindowTitle,
          fallbackAppName: built.usedFallbackAppName,
          normalizedAppName: built.usedNormalizedName
        }
      );
      logger.info("tracking-event-diagnostics", {
        eventId,
        rawApp: built.metadata.rawApplication,
        rawWindowTitle: built.metadata.rawWindowTitle,
        application: built.metadata.application,
        hasWindowTitle: built.metadata.windowTitle.length > 0,
        hasForegroundWindowHandle: Boolean(context.hasForegroundWindowHandle),
        source: "ipc.handlers.tracking:event",
        windowReasonCode: context.windowReasonCode ?? null
      });
      if (parsed.type === "APP_FOCUS") {
        logger.info("app-focus-payload", {
          eventUuid: eventId,
          occurredAtIso: parsed.occurredAt,
          appName: built.metadata.application,
          windowTitle: built.metadata.windowTitle,
          activeSeconds,
          idleSeconds,
          trackerElapsedMs,
          intervalSource,
          meetingPresenceOverride: meetingPresence.treatIntervalAsFullActiveWork,
          meetingPresenceReason: meetingPresence.reason
        });
      }

      enqueueEvent("activity", eventPayload);
      logger.info("tracking-event-queued", {
        type: parsed.type,
        hasSessionId: hasUsableSessionId(state.sessionId),
        hasAppName: Boolean((context.appName ?? context.application)),
        hasWindowTitle: Boolean((context.activeWindowTitle ?? context.windowTitle))
      });
      await worker.flush();
      if (parsed.type === "APP_FOCUS") {
        const occurredAtMs = new Date(parsed.occurredAt).getTime();
        if (Number.isFinite(occurredAtMs)) {
          localVerifierEvents.push({
            occurredAtMs,
            application: built.metadata.application,
            activeSeconds
          });
          if (localVerifierEvents.length > MAX_LOCAL_VERIFY_EVENTS) {
            localVerifierEvents.splice(0, localVerifierEvents.length - MAX_LOCAL_VERIFY_EVENTS);
          }
          const first = localVerifierEvents[0];
          const last = localVerifierEvents[localVerifierEvents.length - 1];
          if (first && last && last.occurredAtMs > first.occurredAtMs) {
            const wallClockSeconds = (last.occurredAtMs - first.occurredAtMs) / 1000;
            const totalActiveSeconds = localVerifierEvents.reduce((sum, item) => sum + item.activeSeconds, 0);
            if (wallClockSeconds >= 300) {
              const ratio = totalActiveSeconds / wallClockSeconds;
              const byApp: Record<string, number> = {};
              for (const item of localVerifierEvents) {
                byApp[item.application] = (byApp[item.application] ?? 0) + item.activeSeconds;
              }
              const topApps = Object.entries(byApp)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([appName, seconds]) => ({
                  appName,
                  activeMinutes: Number((seconds / 60).toFixed(2))
                }));
              const pass = ratio >= 0.6 && ratio <= 1.15;
              logger.info("app-focus-local-verifier", {
                status: pass ? "PASS" : "FAIL",
                wallClockMinutes: Number((wallClockSeconds / 60).toFixed(2)),
                totalActiveMinutes: Number((totalActiveSeconds / 60).toFixed(2)),
                ratio: Number(ratio.toFixed(3)),
                likelyCause: pass ? "none" : "non-incremental or overlapping durations",
                topApps
              });
            }
          }
        }
      }
      return { queued: true };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_STOP, async (_event, payload) => {
    try {
      const parsed = stopSchema.parse(payload);
      const state = getSessionState();

      if ((!readToken() && !readSessionCookie()) || !state.active) {
        throw new Error("VALIDATION: No active session to stop.");
      }

      logger.info("tracking-stop-flow-start", {
        localSessionId: state.sessionId,
        stoppedAt: parsed.stoppedAt
      });
      logger.info("tracking-stop-followup", { step: "flush-before-stop" });
      await worker.flush();
      const stopResult = await api.stopSession(
        {
          sessionId: state.sessionId,
          stoppedAt: parsed.stoppedAt,
          clientTimeZone: getClientIanaTimeZone()
        },
        authContext()
      );
      logger.info("tracking-stop-flow-result", stopResult);
      logger.info("tracking-stop-followup", { step: "flush-after-stop" });
      const clearedAfterStop = clearSyntheticSessionPendingEvents();
      if (clearedAfterStop > 0) {
        logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedAfterStop, reason: "after-stop" });
      }
      await worker.flush();

      saveSessionState({
        active: 0,
        sessionId: null,
        projectId: null,
        description: null,
        startedAt: null
      });
      worker.stop();
      screenshotWorker.stop();

      sendSessionStatus(mainWindow);
      return stopResult;
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_SYNC_STATUS, () => worker.getStatus());
  ipcMain.handle(IPC_CHANNELS.TRACKING_DEBUG_LAST_EVENTS, () => trackingDiagnostics.snapshot(200));

  ipcMain.handle(IPC_CHANNELS.SYNC_NOW, async () => {
    try {
      const status = await worker.flush();
      return { ok: true, status };
    } catch (error) {
      logger.error("sync-now-failed", { error });
      throw asUserError(error);
    }
  });
}
