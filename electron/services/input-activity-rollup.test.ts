import { describe, expect, it, beforeEach } from "vitest";
import {
  clearInputActivityRollup,
  getMouseStatsForPeriod,
  getWorkActivityStatsForPeriod,
  recordInputActivityRollupSample
} from "./input-activity-rollup";

describe("input-activity-rollup", () => {
  beforeEach(() => {
    clearInputActivityRollup();
  });

  it("computes period mouse % from samples in the window only", () => {
    const periodEnd = 1_000_000;
    const tenMin = 10 * 60 * 1000;

    recordInputActivityRollupSample({
      endedAtMs: periodEnd - 8 * 60 * 1000,
      mouseActiveSeconds: 30,
      trackerElapsedMs: 15_000
    });
    recordInputActivityRollupSample({
      endedAtMs: periodEnd - 2 * 60 * 1000,
      mouseActiveSeconds: 30,
      trackerElapsedMs: 15_000
    });
    recordInputActivityRollupSample({
      endedAtMs: periodEnd - 11 * 60 * 1000,
      mouseActiveSeconds: 300,
      trackerElapsedMs: 15_000
    });

    const stats = getMouseStatsForPeriod(periodEnd, tenMin);
    expect(stats.mouseActiveSeconds).toBe(60);
    expect(stats.mouseMovePercent).toBe(10);
    expect(stats.sampleCount).toBe(2);
  });

  it("returns 0% when no samples in period", () => {
    const stats = getMouseStatsForPeriod(Date.now(), 10 * 60 * 1000);
    expect(stats.mouseMovePercent).toBe(0);
    expect(stats.mouseActiveSeconds).toBe(0);
  });

  it("computes work activity % from valid engaged seconds in the window", () => {
    const periodEnd = 2_000_000;
    const oneHour = 60 * 60 * 1000;
    const sessionStart = periodEnd - oneHour;

    for (let index = 0; index < 240; index += 1) {
      recordInputActivityRollupSample({
        endedAtMs: sessionStart + (index + 1) * 15_000,
        mouseActiveSeconds: 0.2,
        validEngagedSeconds: 0.2,
        activeSeconds: 0.2,
        trackerElapsedMs: 15_000
      });
    }

    const stats = getWorkActivityStatsForPeriod(periodEnd, oneHour, sessionStart);
    expect(stats.sampleCount).toBe(240);
    expect(stats.workActivityPercent).toBeLessThan(5);
    expect(stats.trackedSeconds).toBeGreaterThan(3500);
  });
});
