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
import { clearSyntheticSessionPendingEvents, enqueueEvent, getSessionState, saveSessionState } from "../db/queue-repo";
import { logger } from "../config/logger";
import { SyncWorker } from "../services/sync-worker";
import { collectActivityContext } from "../services/activity-metadata";
import { readEnv } from "../config/env";

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

export function registerIpc(mainWindow: BrowserWindow): void {
  const env = readEnv();
  const worker = new SyncWorker({ readToken, readSessionCookie, window: mainWindow });
  const clearedOnBoot = clearSyntheticSessionPendingEvents();
  if (clearedOnBoot > 0) {
    logger.info("queue-cleanup-synthetic-session-events", { cleared: clearedOnBoot });
  }
  worker.start();

  mainWindow.on("closed", () => {
    worker.stop();
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
      return { ok: true, roles: [] };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => {
    try {
      const probe = await api.probeSession(authContext());
      return { authenticated: probe.authenticated, roles: [] };
    } catch {
      clearToken();
      clearSessionCookie();
      return { authenticated: false, roles: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    try {
      await api.logout(authContext());
    } catch (error) {
      logger.warn("backend-logout-failed", { error });
    } finally {
      clearToken();
      clearSessionCookie();
    }
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_PROJECTS, async () => {
    try {
      const projects = await api.getProjects(authContext());
      return { projects };
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
      if (currentState.active) throw new Error("VALIDATION: Session already running.");

      logger.info("tracking-start-validated", {
        hasProjectId: parsed.projectId.length > 0,
        descriptionLength: parsed.description.length
      });
      const result = await api.startSession(parsed, authContext());
      saveSessionState({
        active: 1,
        sessionId: result.sessionId ?? null,
        projectId: parsed.projectId,
        description: parsed.description,
        startedAt: new Date().toISOString()
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
      if (!hasUsableSessionId(state.sessionId)) return { queued: false };

      const context = await collectActivityContext();
      const eventPayload = {
        sessionId: state.sessionId,
        type: parsed.type,
        occurredAt: parsed.occurredAt,
        metadata: {
          ...(parsed.metadata ?? {}),
          ...context
        }
      };

      enqueueEvent("activity", eventPayload);
      await worker.flush();
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
      const stopResult = await api.stopSession({ sessionId: state.sessionId, stoppedAt: parsed.stoppedAt }, authContext());
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

      sendSessionStatus(mainWindow);
      return stopResult;
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_SYNC_STATUS, () => worker.getStatus());

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
