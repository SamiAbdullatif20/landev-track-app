import { app, dialog, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import fs from "node:fs";
import path from "node:path";
import { readEnv } from "../config/env";
import { logger } from "../config/logger";

let started = false;
let checking = false;
let updateDialogOpen = false;

function clearStaleUpdaterCache(): void {
  try {
    const cacheRoot = path.join(app.getPath("userData"), "..", "landev-track-app-updater");
    const pending = path.join(app.getPath("userData"), "pending-update");
    for (const dir of [cacheRoot, pending]) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        logger.info("updater-cache-cleared", { dir });
      }
    }
  } catch (error) {
    logger.warn("updater-cache-clear-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
  }
}

function configureFeed(): void {
  const env = readEnv();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  if (env.updateFeedUrl) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: env.updateFeedUrl
    });
  }
}

async function promptAndInstall(version: string): Promise<void> {
  if (updateDialogOpen) return;
  updateDialogOpen = true;
  try {
    const result = await dialog.showMessageBox({
      type: "info",
      title: "Software update needed",
      message: `LANDEV Tracker ${version} is ready.`,
      detail: "Install the update and restart to continue.",
      buttons: ["Restart and update", "Later"],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });
    if (result.response === 0) {
      logger.info("updater-quit-and-install", { version });
      autoUpdater.quitAndInstall(false, true);
    }
  } finally {
    updateDialogOpen = false;
  }
}

export function startAutoUpdater(getMainWindow?: () => BrowserWindow | null): void {
  if (started) return;
  started = true;

  if (!app.isPackaged) {
    logger.info("updater-skipped-dev-build");
    return;
  }

  const env = readEnv();
  if (!env.autoUpdateEnabled) {
    logger.info("updater-disabled-by-env");
    return;
  }

  configureFeed();
  clearStaleUpdaterCache();

  autoUpdater.on("checking-for-update", () => {
    logger.info("updater-checking", { feed: env.updateFeedUrl });
  });

  autoUpdater.on("update-available", (info) => {
    logger.info("updater-available", { version: info.version });
  });

  autoUpdater.on("update-not-available", (info) => {
    logger.info("updater-not-available", { version: info.version });
  });

  autoUpdater.on("error", (error) => {
    checking = false;
    logger.warn("updater-error", { error: error instanceof Error ? error.message : "unknown" });
  });

  autoUpdater.on("download-progress", (progress) => {
    logger.info("updater-download-progress", {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    checking = false;
    logger.info("updater-downloaded", { version: info.version });
    const win = getMainWindow?.();
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
    void promptAndInstall(info.version);
  });

  const runCheck = async () => {
    if (checking) return;
    checking = true;
    try {
      clearStaleUpdaterCache();
      await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.warn("updater-check-failed", {
        error: error instanceof Error ? error.message : "unknown"
      });
      checking = false;
    }
  };

  // Delay first check so startup UI is ready.
  setTimeout(() => {
    void runCheck();
  }, 8_000);

  setInterval(() => {
    void runCheck();
  }, 4 * 60 * 60 * 1000);

  logger.info("updater-started", { feed: env.updateFeedUrl });
}
