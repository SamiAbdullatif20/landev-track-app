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
      validKeyboardSeconds: 8,
      validMouseSeconds: 4,
      antiCheatFlags: []
    });
    ingestActivityIntervalSubsample({
      endedAtMs: intervalStart + 60_000,
      trackedSeconds: 15,
      activeSeconds: 10,
      idleSeconds: 5,
      validKeyboardSeconds: 5,
      validMouseSeconds: 6,
      antiCheatFlags: []
    });

    const flushed = flushActivityIntervalTracker();
    expect(flushed).not.toBeNull();
    expect(flushed?.trackedSeconds).toBe(30);
    expect(flushed?.validKeyboardSeconds).toBe(13);
    expect(flushed?.validMouseSeconds).toBe(10);
    expect(flushed?.activityScore).toBeGreaterThan(0);
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
      validKeyboardSeconds: 10,
      validMouseSeconds: 8,
      antiCheatFlags: []
    });

    const completed = ingestActivityIntervalSubsample({
      endedAtMs: secondBlock,
      trackedSeconds: 15,
      activeSeconds: 5,
      idleSeconds: 10,
      validKeyboardSeconds: 2,
      validMouseSeconds: 1,
      antiCheatFlags: []
    });

    expect(completed).toHaveLength(1);
    expect(completed[0]?.trackedSeconds).toBe(15);
    expect(completed[0]?.activityScore).toBeGreaterThan(0);
  });
});
