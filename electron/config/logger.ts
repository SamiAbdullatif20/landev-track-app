import log from "electron-log/main";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export const logger = log;

function resolveLogFilePath(): string {
  const logPath = path.join(app?.getPath?.("logs") ?? process.cwd(), "landev-track.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  return logPath;
}

logger.initialize();
logger.transports.file.level = "info";
const isPackaged = typeof app?.isPackaged === "boolean" ? app.isPackaged : false;
logger.transports.console.level = isPackaged ? "warn" : "debug";
logger.transports.file.maxSize = 5 * 1024 * 1024;
logger.transports.file.resolvePathFn = () => resolveLogFilePath();

const baseArchiveFn = logger.transports.file.archiveLogFn;
let archiveInProgress = false;

/** Safe rotation — missing log file or errors must not recurse through the file transport. */
logger.transports.file.archiveLogFn = (oldLogFile) => {
  if (archiveInProgress) {
    return;
  }
  const oldPath =
    typeof oldLogFile === "string"
      ? oldLogFile
      : typeof oldLogFile === "object" && oldLogFile && "path" in oldLogFile
        ? String((oldLogFile as { path: string }).path)
        : null;
  if (!oldPath || !fs.existsSync(oldPath)) {
    return;
  }

  archiveInProgress = true;
  try {
    baseArchiveFn(oldLogFile);
  } catch {
    // Never log from here; electron-log would retry rotation and overflow the stack.
  } finally {
    archiveInProgress = false;
  }
};
