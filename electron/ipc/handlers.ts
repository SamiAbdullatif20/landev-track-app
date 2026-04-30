import { BrowserWindow, ipcMain, app } from "electron";
import { IPC_CHANNELS } from "./channels";
import { eventSchema, loginSchema, startSchema, stopSchema } from "./schemas";
import * as api from "../api/client";
import { clearToken, readToken, saveToken } from "../security/token-store";
import { enqueueEvent, getSessionState, saveSessionState } from "../db/queue-repo";
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
  return {
    active: Boolean(state.active),
    sessionId: state.sessionId,
    projectId: state.projectId,
    description: state.description,
    startedAt: state.startedAt
  };
}

function sendSessionStatus(mainWindow: BrowserWindow): void {
  mainWindow.webContents.send("tracking:status-push", normalizeSessionState());
}

export function registerIpc(mainWindow: BrowserWindow): void {
  const env = readEnv();
  const worker = new SyncWorker({ readToken, window: mainWindow });
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
      const result = await api.login(parsed);
      if (result.token) {
        saveToken(result.token);
      }
      let roles: string[] = [];
      try {
        const me = await api.me({ token: readToken() ?? undefined });
        roles = me.roles;
      } catch (meError) {
        logger.warn("auth-me-unavailable-after-login", { error: meError });
      }
      await worker.flush();
      return { ok: true, roles };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => {
    try {
      const token = readToken();
      if (!token) {
        return { authenticated: false, roles: [] };
      }

      const me = await api.me({ token });
      return { authenticated: true, roles: me.roles };
    } catch {
      clearToken();
      return { authenticated: false, roles: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    try {
      const token = readToken();
      if (token) {
        await api.logout({ token });
      }
    } catch (error) {
      logger.warn("backend-logout-failed", { error });
    } finally {
      clearToken();
    }
    return { ok: true };
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_PROJECTS, async () => {
    try {
      const token = readToken();
      if (!token) {
        throw new Error("AUTH: Not authenticated");
      }

      const projects = await api.getProjects({ token });
      return { projects };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_STATUS, () => normalizeSessionState());

  ipcMain.handle(IPC_CHANNELS.SESSION_START, async (_event, payload) => {
    try {
      const parsed = startSchema.parse(payload);
      const token = readToken();
      const currentState = getSessionState();

      if (!token) throw new Error("AUTH: Not authenticated");
      if (currentState.active) throw new Error("VALIDATION: Session already running.");

      const result = await api.startSession(parsed, { token });
      saveSessionState({
        active: 1,
        sessionId: result.sessionId,
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
      if (!state.sessionId) return { queued: false };

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
      const token = readToken();
      const state = getSessionState();

      if (!token || !state.sessionId) {
        throw new Error("VALIDATION: No active session to stop.");
      }

      await worker.flush();
      await api.stopSession({ sessionId: state.sessionId, stoppedAt: parsed.stoppedAt }, { token });

      saveSessionState({
        active: 0,
        sessionId: null,
        projectId: null,
        description: null,
        startedAt: null
      });

      sendSessionStatus(mainWindow);
      return { ok: true };
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
