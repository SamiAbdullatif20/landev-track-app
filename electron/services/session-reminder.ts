import { logger } from "../config/logger";
import { getSessionState } from "../db/queue-repo";
import { notifyDesktop } from "./desktop-notifications";

/** Remind user a work session is still running (hours). */
export const SESSION_REMINDER_INTERVAL_MS = 2 * 60 * 60 * 1000;

export class SessionReminderService {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.fireIfStillTracking();
    }, SESSION_REMINDER_INTERVAL_MS);
    logger.info("session-reminder-started", { intervalMs: SESSION_REMINDER_INTERVAL_MS });
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
    logger.info("session-reminder-stopped");
  }

  private async fireIfStillTracking(): Promise<void> {
    const state = getSessionState();
    if (!state.active) {
      return;
    }
    await notifyDesktop({
      event: "session_reminder",
      title: "LANDEV — session still running",
      body: "You are still tracking time. Stop the session when you finish work."
    });
  }
}
