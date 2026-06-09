import { app, type BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { ipcMain } from "electron";
import { logger } from "../config/logger";
import { readEnv } from "../config/env";
import { IPC_CHANNELS } from "../ipc/channels";

export type AppUpdateStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available"; version: string; currentVersion: string }
  | { phase: "downloading"; percent: number }
  | { phase: "ready"; version: string }
  | { phase: "error"; message: string };

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

let mainWindow: BrowserWindow | null = null;
let checkTimer: NodeJS.Timeout | null = null;
let ipcRegistered = false;
let lastStatus: AppUpdateStatus = { phase: "idle" };

function pushUpdateStatus(status: AppUpdateStatus): void {
  lastStatus = status;
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("app:update-status-push", status);
}

export function getLastUpdateStatus(): AppUpdateStatus {
  return lastStatus;
}

export async function checkForAppUpdates(): Promise<void> {
  const env = readEnv();
  if (!env.autoUpdateEnabled || !app.isPackaged) {
    return;
  }
  pushUpdateStatus({ phase: "checking" });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update check failed";
    logger.warn("updater-check-failed", { error: message });
    pushUpdateStatus({ phase: "error", message });
  }
}

export async function downloadAppUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate();
}

export function installAppUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}

function registerAutoUpdateIpc(): void {
  if (ipcRegistered) {
    return;
  }
  ipcRegistered = true;

  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_STATUS, () => getLastUpdateStatus());
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_CHECK, async () => {
    await checkForAppUpdates();
    return getLastUpdateStatus();
  });
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_DOWNLOAD, async () => {
    await downloadAppUpdate();
    return getLastUpdateStatus();
  });
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_INSTALL, () => {
    installAppUpdate();
    return { ok: true as const };
  });
}

export function setupAutoUpdate(window: BrowserWindow): void {
  mainWindow = window;
  registerAutoUpdateIpc();

  const env = readEnv();
  if (!env.autoUpdateEnabled || !app.isPackaged) {
    logger.info("auto-update-disabled", { enabled: env.autoUpdateEnabled, packaged: app.isPackaged });
    return;
  }

  autoUpdater.logger = logger;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    pushUpdateStatus({ phase: "checking" });
    logger.info("updater-checking");
  });

  autoUpdater.on("update-available", (info) => {
    logger.info("updater-available", { version: info.version });
    pushUpdateStatus({
      phase: "available",
      version: info.version,
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on("update-not-available", () => {
    logger.info("updater-none");
    pushUpdateStatus({ phase: "idle" });
  });

  autoUpdater.on("download-progress", (progress) => {
    pushUpdateStatus({
      phase: "downloading",
      percent: Math.max(0, Math.min(100, progress.percent))
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    logger.info("updater-downloaded", { version: info.version });
    pushUpdateStatus({ phase: "ready", version: info.version });
  });

  autoUpdater.on("error", (error) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("updater-error", { error: message });
    pushUpdateStatus({ phase: "error", message });
  });

  void checkForAppUpdates();
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  checkTimer = setInterval(() => {
    void checkForAppUpdates();
  }, UPDATE_CHECK_INTERVAL_MS);

  logger.info("auto-update-enabled", { currentVersion: app.getVersion() });
}
