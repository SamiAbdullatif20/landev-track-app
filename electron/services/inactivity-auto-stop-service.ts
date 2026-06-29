import { logger } from "../config/logger";
import { getSessionState } from "../db/queue-repo";
import { notifyDesktop } from "./desktop-notifications";
import {
  evaluateInactivityAutoStop,
  INACTIVITY_CHECK_INTERVAL_MS,
  INACTIVITY_EVALUATION_PERIOD_MS
} from "./inactivity-auto-stop";
import { getWorkActivityStatsForPeriod } from "./input-activity-rollup";

export type InactivityAutoStopCallback = (input: {
  stoppedAt: string;
  workActivityPercent: number;
}) => Promise<void>;

export class InactivityAutoStopService {
  private timer: NodeJS.Timeout | null = null;
  private stopInFlight = false;

  constructor(private readonly onAutoStop: InactivityAutoStopCallback) {}

  start(): void {
    if (this.timer) {
      return;
    }
    this.stopInFlight = false;
    this.timer = setInterval(() => {
      void this.evaluateAndMaybeStop();
    }, INACTIVITY_CHECK_INTERVAL_MS);
    logger.info("inactivity-auto-stop-started", {
      checkIntervalMs: INACTIVITY_CHECK_INTERVAL_MS,
      evaluationPeriodMs: INACTIVITY_EVALUATION_PERIOD_MS
    });
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
    this.stopInFlight = false;
    logger.info("inactivity-auto-stop-stopped");
  }

  private async evaluateAndMaybeStop(): Promise<void> {
    if (this.stopInFlight) {
      return;
    }

    const state = getSessionState();
    if (!state.active || !state.startedAt) {
      return;
    }

    const nowMs = Date.now();
    const sessionStartedAtMs = Date.parse(state.startedAt);
    if (!Number.isFinite(sessionStartedAtMs)) {
      return;
    }

    const stats = getWorkActivityStatsForPeriod(
      nowMs,
      INACTIVITY_EVALUATION_PERIOD_MS,
      sessionStartedAtMs
    );
    const evaluation = evaluateInactivityAutoStop({
      sessionStartedAtMs,
      nowMs,
      workActivityPercent: stats.workActivityPercent,
      trackedSecondsInPeriod: stats.trackedSeconds,
      evaluationPeriodSeconds: INACTIVITY_EVALUATION_PERIOD_MS / 1000,
      sampleCount: stats.sampleCount
    });

    if (!evaluation.shouldStop) {
      logger.info("inactivity-auto-stop-check", {
        reason: evaluation.reason,
        workActivityPercent: stats.workActivityPercent,
        trackedSeconds: stats.trackedSeconds,
        sampleCount: stats.sampleCount,
        sessionMinutes: Math.round((nowMs - sessionStartedAtMs) / 60_000)
      });
      return;
    }

    this.stopInFlight = true;
    const stoppedAt = new Date().toISOString();
    logger.warn("inactivity-auto-stop-triggered", {
      workActivityPercent: stats.workActivityPercent,
      trackedSeconds: stats.trackedSeconds,
      sampleCount: stats.sampleCount,
      periodStartAt: stats.periodStartAt,
      periodEndAt: stats.periodEndAt
    });

    try {
      await notifyDesktop({
        event: "session_reminder",
        title: "LANDEV — tracking stopped",
        body:
          "Your session was stopped automatically after 1 hour with very low work activity (under 5%)."
      });
      await this.onAutoStop({
        stoppedAt,
        workActivityPercent: stats.workActivityPercent
      });
    } catch (error) {
      this.stopInFlight = false;
      logger.error("inactivity-auto-stop-failed", { error });
    }
  }
}
