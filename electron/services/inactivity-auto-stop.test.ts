import { describe, expect, it } from "vitest";
import {
  evaluateInactivityAutoStop,
  INACTIVITY_ACTIVITY_THRESHOLD_PERCENT,
  INACTIVITY_EVALUATION_PERIOD_MS,
  INACTIVITY_MIN_SESSION_MS
} from "./inactivity-auto-stop";

const HOUR_SEC = INACTIVITY_EVALUATION_PERIOD_MS / 1000;
const SESSION_START = 1_000_000;
const AFTER_ONE_HOUR = SESSION_START + INACTIVITY_MIN_SESSION_MS;

function baseInput(overrides: Partial<Parameters<typeof evaluateInactivityAutoStop>[0]> = {}) {
  return {
    sessionStartedAtMs: SESSION_START,
    nowMs: AFTER_ONE_HOUR,
    workActivityPercent: 2,
    trackedSecondsInPeriod: HOUR_SEC * 0.9,
    evaluationPeriodSeconds: HOUR_SEC,
    sampleCount: 200,
    ...overrides
  };
}

describe("evaluateInactivityAutoStop", () => {
  it("does not stop before one hour of tracking", () => {
    const result = evaluateInactivityAutoStop(
      baseInput({ nowMs: SESSION_START + INACTIVITY_MIN_SESSION_MS - 60_000 })
    );
    expect(result.shouldStop).toBe(false);
    expect(result.reason).toBe("session_too_short");
  });

  it("does not stop when activity is at or above 5%", () => {
    const result = evaluateInactivityAutoStop(
      baseInput({ workActivityPercent: INACTIVITY_ACTIVITY_THRESHOLD_PERCENT })
    );
    expect(result.shouldStop).toBe(false);
    expect(result.reason).toBe("activity_above_threshold");
  });

  it("stops when session ran 1h+ and activity stayed below 5%", () => {
    const result = evaluateInactivityAutoStop(baseInput());
    expect(result.shouldStop).toBe(true);
    expect(result.reason).toBe("prolonged_low_activity");
  });

  it("does not stop when sample coverage is too sparse", () => {
    const result = evaluateInactivityAutoStop(
      baseInput({ trackedSecondsInPeriod: HOUR_SEC * 0.5, workActivityPercent: 1 })
    );
    expect(result.shouldStop).toBe(false);
    expect(result.reason).toBe("insufficient_sample_coverage");
  });

  it("does not stop with too few samples even if activity is low", () => {
    const result = evaluateInactivityAutoStop(
      baseInput({ sampleCount: 2, workActivityPercent: 0 })
    );
    expect(result.shouldStop).toBe(false);
    expect(result.reason).toBe("insufficient_samples");
  });
});
