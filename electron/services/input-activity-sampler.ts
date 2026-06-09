import { logger } from "../config/logger";
import { getSessionState } from "../db/queue-repo";
import { InputActivityCounter } from "./input-activity-counter";
import {
  computeMouseMovePercent,
  cursorTravelPx,
  isMouseActivePoll
} from "./mouse-activity-metrics";
import { probeWindowsInputSnapshot } from "./input-probe-windows";
import { recordInputActivityEvent } from "./tracking-input-activity";

export const INPUT_ACTIVITY_SAMPLE_MS = 15_000;
export const INPUT_ACTIVITY_POLL_MS = 1_000;

export class InputActivitySampler {
  private pollTimer: NodeJS.Timeout | null = null;
  private sampleTimer: NodeJS.Timeout | null = null;
  private readonly counter = new InputActivityCounter();
  private lastIdleMs = 0;
  private pollCount = 0;
  private pollsWithSignificantMovement = 0;
  private maxIdleMsInWindow = 0;
  private lastSampleX: number | null = null;
  private lastSampleY: number | null = null;
  private runGeneration = 0;

  start(): void {
    if (this.sampleTimer) {
      return;
    }
    this.runGeneration += 1;
    this.pollCount = 0;
    this.pollsWithSignificantMovement = 0;
    this.maxIdleMsInWindow = 0;
    this.lastSampleX = null;
    this.lastSampleY = null;
    this.lastIdleMs = 0;

    logger.info("input-activity-sampler-started", {
      sampleMs: INPUT_ACTIVITY_SAMPLE_MS,
      pollMs: INPUT_ACTIVITY_POLL_MS
    });

    this.pollTimer = setInterval(() => void this.pollOnce(), INPUT_ACTIVITY_POLL_MS);
    this.sampleTimer = setInterval(() => void this.emitSample("interval"), INPUT_ACTIVITY_SAMPLE_MS);
    void this.pollOnce();
    void this.emitSample("session_start");
  }

  stop(): void {
    this.runGeneration += 1;
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info("input-activity-sampler-stopped");
  }

  private isRunActive(runId: number): boolean {
    return runId === this.runGeneration && getSessionState().active === 1;
  }

  private async pollOnce(): Promise<void> {
    const runId = this.runGeneration;
    if (!this.isRunActive(runId)) {
      return;
    }
    const snapshot = await probeWindowsInputSnapshot();
    if (!this.isRunActive(runId) || !snapshot) {
      return;
    }
    this.pollCount += 1;
    this.maxIdleMsInWindow = Math.max(this.maxIdleMsInWindow, snapshot.idleMs);
    const travelPx =
      this.lastSampleX !== null && this.lastSampleY !== null
        ? cursorTravelPx(this.lastSampleX, this.lastSampleY, snapshot.x, snapshot.y)
        : 0;
    if (isMouseActivePoll(travelPx, snapshot.scrollCount)) {
      this.pollsWithSignificantMovement += 1;
    }
    this.lastSampleX = snapshot.x;
    this.lastSampleY = snapshot.y;
    this.lastIdleMs = snapshot.idleMs;
    this.counter.ingest(snapshot);
  }

  private async emitSample(triggerType: string): Promise<void> {
    const runId = this.runGeneration;
    if (!this.isRunActive(runId)) {
      return;
    }

    await this.pollOnce();
    if (!this.isRunActive(runId)) {
      return;
    }

    const drained = this.counter.drain();
    const windowMs = INPUT_ACTIVITY_SAMPLE_MS;
    const idleMs = Math.min(windowMs, this.maxIdleMsInWindow);
    const activeMs = Math.max(0, windowMs - idleMs);
    const activeSeconds = Number((activeMs / 1000).toFixed(3));
    const idleSeconds = Number(((windowMs - activeMs) / 1000).toFixed(3));

    const { mouseMovePercent, mouseMoveSamples, totalSamples, mouseActiveSeconds } =
      computeMouseMovePercent(
        {
          pollCount: this.pollCount,
          pollsWithSignificantMovement: this.pollsWithSignificantMovement
        },
        windowMs
      );
    this.pollCount = 0;
    this.pollsWithSignificantMovement = 0;
    this.maxIdleMsInWindow = 0;

    await recordInputActivityEvent({
      mouseMoveCount: drained.mouseMoveCount,
      keyPressCount: drained.keyPressCount,
      clickCount: drained.clickCount,
      scrollCount: drained.scrollCount,
      activeSeconds,
      idleSeconds,
      trackerElapsedMs: windowMs,
      totalSamples,
      mouseMoveSamples,
      mouseMovePercent,
      mouseActiveSeconds,
      triggerType
    });
  }
}
