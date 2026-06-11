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
const UPDATE_CHECK_MAX_ATTEMPTS = 3;
const RETRYABLE_UPDATE_ERROR =
  /ERR_NETWORK|ECONNRESET|ETIMEDOUT|ERR_NETWORK_IO_SUSPENDED|ENOTFOUND|Cannot parse releases feed|Unable to find latest version/i;

let mainWindow: BrowserWindow | null = null;
let checkTimer: NodeJS.Timeout | null = null;
let ipcRegistered = false;
let feedConfigured = false;
let lastStatus: AppUpdateStatus = { phase: "idle" };

function pushUpdateStatus(status: AppUpdateStatus): void {
  lastStatus = status;
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("app:update-status-push", status);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function configureUpdateFeed(): void {
  if (feedConfigured) {
    return;
  }
  const { updateFeedUrl } = readEnv();
  autoUpdater.setFeedURL({
    provider: "generic",
    url: updateFeedUrl
  });
  autoUpdater.disableDifferentialDownload = true;
  feedConfigured = true;
  logger.info("auto-update-feed-configured", { updateFeedUrl });
}

export function getLastUpdateStatus(): AppUpdateStatus {
  return lastStatus;
}

export async function checkForAppUpdates(): Promise<void> {
  const env = readEnv();
  if (!env.autoUpdateEnabled || !app.isPackaged) {
    return;
  }
  configureUpdateFeed();
  pushUpdateStatus({ phase: "checking" });

  for (let attempt = 1; attempt <= UPDATE_CHECK_MAX_ATTEMPTS; attempt++) {
    try {
      await autoUpdater.checkForUpdates();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update check failed";
      logger.warn("updater-check-failed", { attempt, error: message });
      const shouldRetry = attempt < UPDATE_CHECK_MAX_ATTEMPTS && RETRYABLE_UPDATE_ERROR.test(message);
      if (!shouldRetry) {
        pushUpdateStatus({ phase: "idle" });
        return;
      }
      await delay(2000 * attempt);
      pushUpdateStatus({ phase: "checking" });
    }
  }
}

export async function downloadAppUpdate(): Promise<void> {
  configureUpdateFeed();
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

  configureUpdateFeed();
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
    pushUpdateStatus({ phase: "idle" });
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
