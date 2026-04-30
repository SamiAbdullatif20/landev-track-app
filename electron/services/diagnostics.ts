import { app } from "electron";
import { logger } from "../config/logger";

export function setupCrashAndDiagnostics(): void {
  logger.info("startup-diagnostics", {
    appVersion: app.getVersion(),
    appName: app.getName(),
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    env: process.env.VITE_APP_ENV
  });

  process.on("uncaughtException", (error) => {
    logger.error("uncaught-exception", { error });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled-rejection", { reason });
  });

  app.on("render-process-gone", (_event, webContents, details) => {
    logger.error("render-process-gone", { id: webContents.id, reason: details.reason, exitCode: details.exitCode });
  });

  app.on("child-process-gone", (_event, details) => {
    logger.error("child-process-gone", details);
  });
}
