import log from "electron-log/main";
import path from "node:path";
import { app } from "electron";

export const logger = log;

logger.initialize();
logger.transports.file.level = "info";
logger.transports.console.level = "debug";
logger.transports.file.maxSize = 5 * 1024 * 1024;
logger.transports.file.resolvePathFn = () => path.join(app.getPath("logs"), "landev-track.log");

const baseArchiveFn = logger.transports.file.archiveLogFn;
logger.transports.file.archiveLogFn = (oldPath) => {
  baseArchiveFn(oldPath);
  logger.info("log-rotated", { oldPath });
};
