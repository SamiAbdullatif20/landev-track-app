import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { logger } from "../config/logger";

const UPDATER_CACHE_DIR = "landev-track-app-updater";

function updaterCacheRoot(): string {
  const localAppData = process.env.LOCALAPPDATA?.trim();
  if (localAppData) {
    return path.join(localAppData, UPDATER_CACHE_DIR);
  }
  return path.join(app.getPath("userData"), "..", UPDATER_CACHE_DIR);
}

/** Drop half-finished installers so the next check always targets the current latest release. */
export function clearPendingUpdaterCache(): void {
  const pendingDir = path.join(updaterCacheRoot(), "pending");
  if (!fs.existsSync(pendingDir)) {
    return;
  }
  try {
    fs.rmSync(pendingDir, { recursive: true, force: true });
    logger.info("updater-pending-cache-cleared", { pendingDir });
  } catch (error) {
    logger.warn("updater-pending-cache-clear-failed", { pendingDir, error });
  }
}
