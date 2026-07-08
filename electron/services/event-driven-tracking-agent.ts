import { logger } from "../config/logger";
import { getSessionState } from "../db/queue-repo";
import { collectActivityContext } from "./activity-metadata";
import { ForegroundEventWatcher } from "./foreground-event-watcher";
import { IdleTransitionMonitor } from "./idle-transition-monitor";
import { probeWindowsInputSnapshot } from "./input-probe-windows";
import {
  emitActivityStart,
  emitActivityStop,
  emitAppChange,
  emitHeartbeat
} from "./tracking-agent-events";
import { isReportableForegroundContext } from "./tracking-app-focus";

/** Agent liveness ping — not a duration sample. */
export const AGENT_HEARTBEAT_INTERVAL_MS = 45_000;

/**
 * Lightweight event-driven tracking agent.
 * Emits timestamped transitions only; no local duration math or per-second polling.
 */
export class EventDrivenTrackingAgent {
  private foregroundWatcher = new ForegroundEventWatcher();
  private idleMonitor = new IdleTransitionMonitor();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private running = false;

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    emitActivityStart();

    this.foregroundWatcher.start(async () => {
      await this.handleForegroundChange();
    });
    void this.foregroundWatcher.detectChange(true);

    this.idleMonitor.start();

    this.heartbeatTimer = setInterval(() => {
      void this.emitHeartbeat();
    }, AGENT_HEARTBEAT_INTERVAL_MS);
    void this.emitHeartbeat();

    logger.info("event-driven-tracking-agent-started", {
      heartbeatMs: AGENT_HEARTBEAT_INTERVAL_MS
    });
  }

  async stop(stopReason?: string): Promise<void> {
    if (!this.running) {
      return;
    }
    this.running = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.foregroundWatcher.stop();
    await this.idleMonitor.flushPending();
    this.idleMonitor.stop();

    emitActivityStop(stopReason);
    logger.info("event-driven-tracking-agent-stopped", { stopReason });
  }

  private async handleForegroundChange(): Promise<void> {
    if (!getSessionState().active) {
      return;
    }
    const context = await collectActivityContext();
    if (!isReportableForegroundContext(context)) {
      return;
    }
    emitAppChange(context);
  }

  private async emitHeartbeat(): Promise<void> {
    if (!this.running || !getSessionState().active) {
      return;
    }

    const snapshot = await probeWindowsInputSnapshot().catch(() => null);
    const systemIdleMs = snapshot?.idleMs ?? 0;
    const context = await collectActivityContext().catch(() => null);
    emitHeartbeat(context, systemIdleMs);
  }
}
