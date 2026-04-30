import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { logger } from "../config/logger";
import { readEnv } from "../config/env";

export function setupAutoUpdate(): void {
  const env = readEnv();
  if (!env.autoUpdateEnabled || !app.isPackaged) {
    logger.info("auto-update-disabled", { enabled: env.autoUpdateEnabled, packaged: app.isPackaged });
    return;
  }

  autoUpdater.logger = logger;
  autoUpdater.autoDownload = false;

  autoUpdater.on("checking-for-update", () => logger.info("updater-checking"));
  autoUpdater.on("update-available", (info) => {
    logger.info("updater-available", { version: info.version });
    autoUpdater.downloadUpdate().catch((error) => logger.warn("updater-download-failed", { error }));
  });
  autoUpdater.on("update-not-available", () => logger.info("updater-none"));
  autoUpdater.on("error", (error) => logger.warn("updater-error", { error }));
  autoUpdater.on("update-downloaded", (info) => logger.info("updater-downloaded", { version: info.version }));

  autoUpdater.checkForUpdates().catch((error) => {
    logger.warn("updater-check-failed", { error });
  });
}
