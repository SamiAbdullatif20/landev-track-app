import { powerSaveBlocker } from "electron";
import { logger } from "../config/logger";

let sessionPowerBlockerId: number | null = null;

export function startSessionPowerBlocker(): void {
  if (sessionPowerBlockerId !== null && powerSaveBlocker.isStarted(sessionPowerBlockerId)) {
    return;
  }
  sessionPowerBlockerId = powerSaveBlocker.start("prevent-app-suspension");
  logger.info("session-power-blocker-started", { id: sessionPowerBlockerId });
}

export function stopSessionPowerBlocker(): void {
  if (sessionPowerBlockerId !== null && powerSaveBlocker.isStarted(sessionPowerBlockerId)) {
    powerSaveBlocker.stop(sessionPowerBlockerId);
    logger.info("session-power-blocker-stopped", { id: sessionPowerBlockerId });
  }
  sessionPowerBlockerId = null;
}
