import { powerMonitor } from "electron";
import { logger } from "../config/logger";
import type { StopActiveSessionFn } from "./session-lifecycle-types";

let registered = false;

/** Stop tracking when the OS sleeps or shuts down so the web dashboard ends live time promptly. */
export function registerSessionPowerLifecycle(stopActiveSession: StopActiveSessionFn): void {
  if (registered) {
    return;
  }
  registered = true;

  const stopForPowerEvent = (reason: "suspend" | "shutdown"): void => {
    logger.info("session-stop-power-event", { reason });
    void stopActiveSession(new Date().toISOString()).catch((error) => {
      logger.warn("session-stop-power-event-failed", { reason, error });
    });
  };

  powerMonitor.on("suspend", () => stopForPowerEvent("suspend"));
  powerMonitor.on("shutdown", () => stopForPowerEvent("shutdown"));
  logger.info("session-power-lifecycle-registered");
}
