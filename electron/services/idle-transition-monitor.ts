import { logger } from "../config/logger";
import { probeWindowsInputSnapshot } from "./input-probe-windows";
import { emitIdleEnd, emitIdleStart } from "./tracking-agent-events";

/** System idle time before emitting idle_start (5 minutes). */
export const IDLE_THRESHOLD_MS = 5 * 60_000;

/** How often idle state is evaluated (not per-second polling). */
export const IDLE_CHECK_INTERVAL_MS = 30_000;

export type IdleState = "active" | "idle";

export class IdleTransitionMonitor {
  private timer: NodeJS.Timeout | null = null;
  private state: IdleState = "active";
  private running = false;

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.state = "active";
    this.timer = setInterval(() => {
      void this.evaluate();
    }, IDLE_CHECK_INTERVAL_MS);
    logger.info("idle-transition-monitor-started", {
      checkMs: IDLE_CHECK_INTERVAL_MS,
      thresholdMs: IDLE_THRESHOLD_MS
    });
    void this.evaluate();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state = "active";
    logger.info("idle-transition-monitor-stopped");
  }

  getState(): IdleState {
    return this.state;
  }

  /** Close an open idle period before session stop. */
  async flushPending(): Promise<void> {
    if (this.state !== "idle") {
      return;
    }
    const snapshot = await probeWindowsInputSnapshot().catch(() => null);
    emitIdleEnd(snapshot?.idleMs ?? IDLE_THRESHOLD_MS);
    this.state = "active";
  }

  private async evaluate(): Promise<void> {
    if (!this.running) {
      return;
    }

    const snapshot = await probeWindowsInputSnapshot().catch(() => null);
    if (!snapshot) {
      return;
    }

    const idleMs = Math.max(0, snapshot.idleMs);
    const shouldBeIdle = idleMs >= IDLE_THRESHOLD_MS;

    if (shouldBeIdle && this.state === "active") {
      this.state = "idle";
      emitIdleStart(idleMs);
      return;
    }

    if (!shouldBeIdle && this.state === "idle") {
      this.state = "active";
      emitIdleEnd(idleMs);
    }
  }
}
