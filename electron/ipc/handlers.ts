import { app, BrowserWindow, ipcMain } from "electron";
import { z } from "zod";
import { IPC_CHANNELS } from "./channels";
import * as api from "../api/client";
import { readEnv } from "../config/env";
import { logger } from "../config/logger";
import {
  clearSessionCookie,
  clearToken,
  readSessionCookie,
  readToken,
  saveSessionCookie,
  saveToken
} from "../security/token-store";
import {
  clearCredentials,
  readCredentials,
  saveCredentials
} from "../security/credential-store";
import { clearApiSessionCookies } from "../security/api-session-cookies";
import { readAuthContext, refreshAuthSession, isAuthenticated } from "../services/auth-session";
import { TrackingController } from "../tracking/controller";
import { readLocalSession } from "../db/local-store";

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

const startSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  description: z.string().trim().min(3).max(2000)
});

function asUserError(error: unknown): Error {
  if (error instanceof api.ApiError) {
    return new Error(error.message);
  }
  if (error instanceof z.ZodError) {
    return new Error(error.issues[0]?.message ?? "Invalid request.");
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error("Unexpected failure.");
}

function authOptions(): api.AuthAwareRequestOptions {
  return {
    ...readAuthContext(),
    onAuthRefresh: refreshAuthSession
  };
}

export function registerIpc(mainWindow: BrowserWindow): void {
  const tracking = new TrackingController(mainWindow);
  tracking.startBackgroundSync();

  const tearDown = () => {
    tracking.dispose();
  };
  mainWindow.on("closed", tearDown);

  ipcMain.removeHandler(IPC_CHANNELS.AUTH_LOGIN);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_LOGOUT);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.CONNECTION_TEST);
  ipcMain.removeHandler(IPC_CHANNELS.APP_INFO);
  ipcMain.removeHandler(IPC_CHANNELS.PROJECTS_LIST);
  ipcMain.removeHandler(IPC_CHANNELS.TRACKING_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.TRACKING_START);
  ipcMain.removeHandler(IPC_CHANNELS.TRACKING_STOP);
  ipcMain.removeHandler(IPC_CHANNELS.TRACKING_SAVE_DESCRIPTION);
  ipcMain.removeHandler(IPC_CHANNELS.RECENT_PROJECTS);

  ipcMain.handle(IPC_CHANNELS.CONNECTION_TEST, async () => api.testConnection());

  ipcMain.handle(IPC_CHANNELS.APP_INFO, () => {
    const env = readEnv();
    return {
      appName: app.getName(),
      appVersion: app.getVersion(),
      env: env.VITE_APP_ENV,
      apiBaseUrl: env.VITE_API_BASE_URL
    };
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => {
    if (!isAuthenticated()) {
      return { authenticated: false, profile: null, tracking: tracking.getStatus() };
    }
    try {
      const probe = await api.probeSession(readAuthContext());
      if (!probe.authenticated) {
        return { authenticated: false, profile: null, tracking: tracking.getStatus() };
      }
      const profile = await api.fetchUserProfile(authOptions());
      await tracking.resumeIfNeeded();
      return { authenticated: true, profile, tracking: tracking.getStatus() };
    } catch (error) {
      logger.warn("auth-status-failed", { error });
      return { authenticated: false, profile: null, tracking: tracking.getStatus() };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, payload) => {
    try {
      const parsed = loginSchema.parse(payload);
      const result = await api.login(
        { username: parsed.username, password: parsed.password },
        readAuthContext()
      );
      if (result.token) saveToken(result.token);
      if (result.sessionCookie) saveSessionCookie(result.sessionCookie);
      saveCredentials(parsed.username, parsed.password);
      const profile = await api.fetchUserProfile(authOptions());
      await tracking.resumeIfNeeded();
      return { ok: true as const, profile, tracking: tracking.getStatus() };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    try {
      if (readLocalSession().active === 1) {
        await tracking.stop();
      }
    } catch (error) {
      logger.warn("logout-stop-failed", { error });
    }
    try {
      await api.logout(readAuthContext());
    } catch {
      // local logout still proceeds
    }
    clearToken();
    clearSessionCookie();
    clearCredentials();
    await clearApiSessionCookies();
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.PROJECTS_LIST, async () => {
    try {
      const projects = await api.fetchProjects(authOptions());
      return { projects };
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_STATUS, () => tracking.getStatus());

  ipcMain.handle(IPC_CHANNELS.TRACKING_START, async (_event, payload) => {
    try {
      const parsed = startSchema.parse(payload);
      return await tracking.start(parsed);
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_STOP, async () => {
    try {
      return await tracking.stop();
    } catch (error) {
      throw asUserError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TRACKING_SAVE_DESCRIPTION, async (_event, payload) => {
    const description = z.string().max(2000).parse(payload?.description ?? "");
    tracking.saveDraftDescription(description);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.RECENT_PROJECTS, () => ({
    projects: tracking.listRecentProjects()
  }));

  // Restore saved session on boot if already authenticated.
  if (readToken() || readSessionCookie()) {
    void tracking.resumeIfNeeded();
  }

  logger.info("ipc-registered-tracker-v2");
}

export async function stopActiveSessionIfRunning(
  options?: { awaitBackgroundSync?: boolean }
): Promise<boolean> {
  void options;
  // Handled via window lifecycle / logout in this build.
  return false;
}
