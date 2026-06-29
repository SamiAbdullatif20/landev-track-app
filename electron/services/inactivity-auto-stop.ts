/** Rolling window used to judge prolonged inactivity (1 hour). */
export const INACTIVITY_EVALUATION_PERIOD_MS = 60 * 60 * 1000;

/** Session must run at least this long before auto-stop can fire. */
export const INACTIVITY_MIN_SESSION_MS = 60 * 60 * 1000;

/** Work activity below this % over the evaluation window triggers auto-stop. */
export const INACTIVITY_ACTIVITY_THRESHOLD_PERCENT = 5;

/** How often to re-check (aligned with 15s activity samples). */
export const INACTIVITY_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Require this much of the evaluation window to be covered by samples
 * so brief probe gaps or startup do not false-trigger.
 */
export const INACTIVITY_MIN_TRACKED_COVERAGE_PERCENT = 80;

/** Minimum 15s samples in the evaluation window before judging. */
export const INACTIVITY_MIN_SAMPLE_COUNT = 8;

export type InactivityEvaluationInput = {
  sessionStartedAtMs: number;
  nowMs: number;
  workActivityPercent: number;
  trackedSecondsInPeriod: number;
  evaluationPeriodSeconds: number;
  sampleCount: number;
};

export type InactivityEvaluationResult = {
  shouldStop: boolean;
  reason: string;
};

export function evaluateInactivityAutoStop(
  input: InactivityEvaluationInput
): InactivityEvaluationResult {
  const sessionElapsedMs = input.nowMs - input.sessionStartedAtMs;
  if (!Number.isFinite(sessionElapsedMs) || sessionElapsedMs < INACTIVITY_MIN_SESSION_MS) {
    return { shouldStop: false, reason: "session_too_short" };
  }

  if (input.sampleCount < INACTIVITY_MIN_SAMPLE_COUNT) {
    return { shouldStop: false, reason: "insufficient_samples" };
  }

  const minTrackedSeconds =
    (INACTIVITY_MIN_TRACKED_COVERAGE_PERCENT / 100) * input.evaluationPeriodSeconds;
  if (input.trackedSecondsInPeriod < minTrackedSeconds) {
    return { shouldStop: false, reason: "insufficient_sample_coverage" };
  }

  if (input.workActivityPercent < INACTIVITY_ACTIVITY_THRESHOLD_PERCENT) {
    return { shouldStop: true, reason: "prolonged_low_activity" };
  }

  return { shouldStop: false, reason: "activity_above_threshold" };
}
