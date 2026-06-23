import { logger } from "../config/logger";
import { getSessionState } from "../db/queue-repo";
import type { ActivityContext } from "./activity-metadata";
import { collectActivityContext } from "./activity-metadata";
import {
  focusSignature,
  isReportableForegroundContext,
  recordAppFocusEvent
} from "./tracking-app-focus";
import {
  recordMeetingAttributionPoll,
  refreshBackgroundMeetingPresence,
  updateForegroundContextForMeeting
} from "./meeting-attribution-state";

export const APP_FOCUS_CHECK_MS = 3_000;
export const APP_FOCUS_TICK_MS = 15_000;
export const MEETING_BACKGROUND_SCAN_MS = 15_000;

export class AppFocusPoller {
  private checkTimer: NodeJS.Timeout | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private lastSignature: string | null = null;
  private lastReportableContext: ActivityContext | null = null;
  private lastEmittedAtMs = 0;
  private lastBackgroundMeetingScanMs = 0;
  private runGeneration = 0;

  start(): void {
    if (this.checkTimer) {
      return;
    }
    this.runGeneration += 1;
    this.lastSignature = null;
    this.lastReportableContext = null;
    this.lastEmittedAtMs = Date.now();
    this.lastBackgroundMeetingScanMs = 0;
    this.checkTimer = setInterval(() => void this.checkForeground(), APP_FOCUS_CHECK_MS);
    this.tickTimer = setInterval(() => void this.emitTick(), APP_FOCUS_TICK_MS);
    logger.info("app-focus-poller-started", {
      checkMs: APP_FOCUS_CHECK_MS,
      tickMs: APP_FOCUS_TICK_MS
    });
    void this.checkForeground();
  }

  stop(): void {
    this.runGeneration += 1;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.lastSignature = null;
    this.lastReportableContext = null;
    logger.info("app-focus-poller-stopped");
  }

  /** Emit remaining foreground seconds before session stop so app-time is not under-counted. */
  async flushPending(): Promise<void> {
    if (!getSessionState().active) {
      return;
    }
    const context = this.lastReportableContext;
    if (!context) {
      return;
    }
    const nowMs = Date.now();
    const activeSeconds = this.elapsedSecondsSinceLastEmit(nowMs);
    if (activeSeconds <= 0) {
      return;
    }
    const queued = await this.emitFocusForContext(context, activeSeconds, "foreground_tick");
    if (queued) {
      this.lastEmittedAtMs = nowMs;
    }
  }

  private isRunActive(runId: number): boolean {
    return runId === this.runGeneration && getSessionState().active === 1;
  }

  private async collectRawContext(): Promise<ActivityContext> {
    let raw = await collectActivityContext();
    if (isReportableForegroundContext(raw)) {
      return raw;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    raw = await collectActivityContext();
    return raw;
  }

  private elapsedSecondsSinceLastEmit(nowMs: number): number {
    return Number((Math.max(0, nowMs - this.lastEmittedAtMs) / 1000).toFixed(3));
  }

  private async emitFocusForContext(
    context: ActivityContext,
    activeSeconds: number,
    triggerType: "foreground_change" | "foreground_tick"
  ): Promise<boolean> {
    const seconds = Math.max(activeSeconds, 0.001);
    return recordAppFocusEvent({
      activeSeconds: seconds,
      source: "app-focus-poller",
      triggerType,
      context,
      trackerElapsedMs: Math.round(seconds * 1000)
    });
  }

  private async maybeRefreshBackgroundMeeting(nowMs: number): Promise<void> {
    if (nowMs - this.lastBackgroundMeetingScanMs < MEETING_BACKGROUND_SCAN_MS) {
      return;
    }
    this.lastBackgroundMeetingScanMs = nowMs;
    await refreshBackgroundMeetingPresence();
  }

  private async checkForeground(): Promise<void> {
    const runId = this.runGeneration;
    if (!this.isRunActive(runId)) {
      return;
    }

    const raw = await this.collectRawContext();
    if (!this.isRunActive(runId)) {
      return;
    }

    const reportableRaw = isReportableForegroundContext(raw) ? raw : null;
    const context = reportableRaw ?? this.lastReportableContext;
    const nowMs = Date.now();
    updateForegroundContextForMeeting(reportableRaw);
    await this.maybeRefreshBackgroundMeeting(nowMs);
    recordMeetingAttributionPoll(reportableRaw);
    if (!context) {
      return;
    }

    const signature = focusSignature(context);

    if (
      this.lastSignature
      && signature !== this.lastSignature
      && this.lastReportableContext
    ) {
      const leavingSeconds = this.elapsedSecondsSinceLastEmit(nowMs);
      if (leavingSeconds > 0) {
        const queued = await this.emitFocusForContext(
          this.lastReportableContext,
          leavingSeconds,
          "foreground_change"
        );
        if (queued && this.isRunActive(runId)) {
          this.lastEmittedAtMs = nowMs;
        }
      }
    }

    if (signature === this.lastSignature) {
      if (reportableRaw) {
        this.lastReportableContext = reportableRaw;
      }
      return;
    }

    this.lastSignature = signature;
    if (reportableRaw) {
      this.lastReportableContext = reportableRaw;
    }

    const initialSeconds = Math.max(this.elapsedSecondsSinceLastEmit(nowMs), APP_FOCUS_CHECK_MS / 1000);
    const queued = await this.emitFocusForContext(context, initialSeconds, "foreground_change");
    if (queued && this.isRunActive(runId)) {
      this.lastEmittedAtMs = nowMs;
    }
  }

  private async emitTick(): Promise<void> {
    const runId = this.runGeneration;
    if (!this.isRunActive(runId)) {
      return;
    }

    const raw = await this.collectRawContext();
    if (!this.isRunActive(runId)) {
      return;
    }

    if (isReportableForegroundContext(raw)) {
      this.lastReportableContext = raw;
    }

    const nowMs = Date.now();
    updateForegroundContextForMeeting(isReportableForegroundContext(raw) ? raw : null);
    await this.maybeRefreshBackgroundMeeting(nowMs);
    recordMeetingAttributionPoll(isReportableForegroundContext(raw) ? raw : null);

    const context = isReportableForegroundContext(raw)
      ? raw
      : this.lastReportableContext;
    if (!context) {
      return;
    }

    const activeSeconds = Math.max(
      this.elapsedSecondsSinceLastEmit(nowMs),
      APP_FOCUS_TICK_MS / 1000
    );

    const queued = await this.emitFocusForContext(context, activeSeconds, "foreground_tick");
    if (queued && this.isRunActive(runId)) {
      this.lastEmittedAtMs = nowMs;
      this.lastSignature = focusSignature(context);
    }
  }
}
