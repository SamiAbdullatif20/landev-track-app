import { app, type BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { ipcMain } from "electron";
import { logger } from "../config/logger";
import { readEnv } from "../config/env";
import { IPC_CHANNELS } from "../ipc/channels";
import { stopActiveSessionIfRunning } from "../ipc/handlers";
import { clearPendingUpdaterCache } from "./updater-cache";

export type AppUpdateStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available"; version: string; currentVersion: string }
  | { phase: "downloading"; percent: number; version: string; transferred: number; total: number; bytesPerSecond: number }
  | { phase: "ready"; version: string }
  | { phase: "error"; message: string; version: string | null };

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const UPDATE_CHECK_MAX_ATTEMPTS = 3;
const INSTALL_STOP_SESSION_TIMEOUT_MS = 30_000;
const RETRYABLE_UPDATE_ERROR =
  /ERR_NETWORK|ECONNRESET|ETIMEDOUT|ERR_NETWORK_IO_SUSPENDED|ENOTFOUND|Cannot parse releases feed|Unable to find latest version/i;

let mainWindow: BrowserWindow | null = null;
let checkTimer: NodeJS.Timeout | null = null;
let ipcRegistered = false;
let feedConfigured = false;
let pendingUpdateVersion: string | null = null;
let cachedDownloadVersion: string | null = null;
let downloadInProgress = false;
let lastStatus: AppUpdateStatus = { phase: "idle" };

function isUpdateFlowActive(): boolean {
  return (
    downloadInProgress
    || lastStatus.phase === "downloading"
    || lastStatus.phase === "ready"
    || lastStatus.phase === "available"
  );
}

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
  if (updateFeedUrl.includes("github.com")) {
    autoUpdater.setFeedURL({
      provider: "github",
      owner: "SamiAbdullatif20",
      repo: "landev-track-app"
    });
  } else {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: updateFeedUrl
    });
  }
  autoUpdater.disableDifferentialDownload = false;
  autoUpdater.allowPrerelease = false;
  feedConfigured = true;
  logger.info("auto-update-feed-configured", { updateFeedUrl });
}

export function getLastUpdateStatus(): AppUpdateStatus {
  return lastStatus;
}

export async function checkForAppUpdates(options: { force?: boolean } = {}): Promise<void> {
  const env = readEnv();
  if (!env.autoUpdateEnabled || !app.isPackaged) {
    return;
  }

  if (!options.force && isUpdateFlowActive()) {
    logger.info("updater-check-skipped-active-download");
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
        pushUpdateStatus({
          phase: "error",
          message: "Could not check for updates. Check your internet connection and try again.",
          version: pendingUpdateVersion
        });
        return;
      }
      await delay(2000 * attempt);
      pushUpdateStatus({ phase: "checking" });
    }
  }
}

export async function retryAppUpdate(): Promise<void> {
  downloadInProgress = false;
  pendingUpdateVersion = null;
  clearPendingUpdaterCache();
  await checkForAppUpdates({ force: true });
}

export async function downloadAppUpdate(): Promise<void> {
  configureUpdateFeed();
  await autoUpdater.downloadUpdate();
}

export async function installAppUpdate(): Promise<void> {
  try {
    await Promise.race([
      stopActiveSessionIfRunning({ awaitBackgroundSync: true }),
      delay(INSTALL_STOP_SESSION_TIMEOUT_MS)
    ]);
    await delay(500);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("updater-stop-session-before-install-failed", { error: message });
  }
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
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_RETRY, async () => {
    await retryAppUpdate();
    return getLastUpdateStatus();
  });
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_DOWNLOAD, async () => {
    await downloadAppUpdate();
    return getLastUpdateStatus();
  });
  ipcMain.handle(IPC_CHANNELS.APP_UPDATE_INSTALL, async () => {
    await installAppUpdate();
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
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    pushUpdateStatus({ phase: "checking" });
    logger.info("updater-checking");
  });

  autoUpdater.on("update-available", (info) => {
    if (cachedDownloadVersion && cachedDownloadVersion !== info.version) {
      clearPendingUpdaterCache();
    }
    cachedDownloadVersion = info.version;
    pendingUpdateVersion = info.version;
    logger.info("updater-available", { version: info.version });
    pushUpdateStatus({
      phase: "available",
      version: info.version,
      currentVersion: app.getVersion()
    });
  });

  autoUpdater.on("update-not-available", () => {
    pendingUpdateVersion = null;
    downloadInProgress = false;
    logger.info("updater-none");
    pushUpdateStatus({ phase: "idle" });
  });

  autoUpdater.on("download-progress", (progress) => {
    downloadInProgress = true;
    const version = pendingUpdateVersion ?? app.getVersion();
    pushUpdateStatus({
      phase: "downloading",
      percent: Math.max(0, Math.min(100, progress.percent)),
      version,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    downloadInProgress = false;
    pendingUpdateVersion = info.version;
    logger.info("updater-downloaded", { version: info.version });
    pushUpdateStatus({ phase: "ready", version: info.version });
  });

  autoUpdater.on("error", (error) => {
    downloadInProgress = false;
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("updater-error", { error: message });
    pushUpdateStatus({
      phase: "error",
      message: "Update download failed. Check your internet connection and try again.",
      version: pendingUpdateVersion
    });
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
