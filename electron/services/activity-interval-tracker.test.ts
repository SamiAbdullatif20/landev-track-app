import { beforeEach, describe, expect, it } from "vitest";
import {
  clearActivityIntervalTracker,
  flushActivityIntervalTracker,
  ingestActivityIntervalSubsample
} from "./activity-interval-tracker";

describe("activity-interval-tracker", () => {
  beforeEach(() => {
    clearActivityIntervalTracker();
  });

  it("aggregates subsamples into a 15-minute interval", () => {
    const intervalStart = Date.parse("2026-06-02T09:00:00.000Z");

    ingestActivityIntervalSubsample({
      endedAtMs: intervalStart + 30_000,
      trackedSeconds: 15,
      activeSeconds: 12,
      idleSeconds: 3,
      validEngagedSeconds: 11,
      validKeyboardSeconds: 8,
      validMouseSeconds: 4,
      validClickSeconds: 2,
      antiCheatFlags: []
    });
    ingestActivityIntervalSubsample({
      endedAtMs: intervalStart + 60_000,
      trackedSeconds: 15,
      activeSeconds: 10,
      idleSeconds: 5,
      validEngagedSeconds: 12,
      validKeyboardSeconds: 5,
      validMouseSeconds: 6,
      validClickSeconds: 3,
      antiCheatFlags: []
    });

    const flushed = flushActivityIntervalTracker();
    expect(flushed).not.toBeNull();
    expect(flushed?.trackedSeconds).toBe(30);
    expect(flushed?.validEngagedSeconds).toBe(23);
    expect(flushed?.validKeyboardSeconds).toBe(13);
    expect(flushed?.validMouseSeconds).toBe(10);
    expect(flushed?.validClickSeconds).toBe(5);
    expect(flushed?.activityScore).toBe(77);
    expect(flushed?.timelineColor).toBeDefined();
  });

  it("emits completed interval when wall-clock block changes", () => {
    const firstBlock = Date.parse("2026-06-02T09:14:00.000Z");
    const secondBlock = Date.parse("2026-06-02T09:16:00.000Z");

    ingestActivityIntervalSubsample({
      endedAtMs: firstBlock,
      trackedSeconds: 15,
      activeSeconds: 15,
      idleSeconds: 0,
      validEngagedSeconds: 12,
      validKeyboardSeconds: 10,
      validMouseSeconds: 8,
      validClickSeconds: 4,
      antiCheatFlags: []
    });

    const completed = ingestActivityIntervalSubsample({
      endedAtMs: secondBlock,
      trackedSeconds: 15,
      activeSeconds: 5,
      idleSeconds: 10,
      validEngagedSeconds: 3,
      validKeyboardSeconds: 2,
      validMouseSeconds: 1,
      validClickSeconds: 1,
      antiCheatFlags: []
    });

    expect(completed).toHaveLength(1);
    expect(completed[0]?.trackedSeconds).toBe(15);
    expect(completed[0]?.activityScore).toBeGreaterThan(0);
  });
});
