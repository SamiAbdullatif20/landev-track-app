import { describe, expect, it } from "vitest";
import {
  liveTodayElapsedMs,
  splitDurationByLocalDays,
  wallElapsedMs
} from "./wall-clock";

describe("wallElapsedMs", () => {
  it("returns exact wall-clock difference", () => {
    expect(wallElapsedMs(1_000, 4_000)).toBe(3_000);
  });

  it("never goes negative", () => {
    expect(wallElapsedMs(5_000, 1_000)).toBe(0);
  });
});

describe("liveTodayElapsedMs", () => {
  it("counts from session start within today", () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const started = new Date(now.getTime() - 90_000);
    expect(liveTodayElapsedMs(started.toISOString(), now.getTime())).toBe(90_000);
  });

  it("clamps overnight sessions to local midnight", () => {
    const now = new Date();
    now.setHours(1, 0, 0, 0);
    const started = new Date(now.getTime());
    started.setDate(started.getDate() - 1);
    started.setHours(22, 0, 0, 0);
    expect(liveTodayElapsedMs(started.toISOString(), now.getTime())).toBe(60 * 60 * 1000);
  });
});

describe("splitDurationByLocalDays", () => {
  it("keeps same-day sessions as one portion", () => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const stop = new Date();
    stop.setHours(10, 30, 0, 0);
    const portions = splitDurationByLocalDays(start.getTime(), stop.getTime());
    expect(portions).toHaveLength(1);
    expect(portions[0]?.durationMs).toBe(90 * 60 * 1000);
  });

  it("splits overnight sessions across days", () => {
    const start = new Date();
    start.setHours(22, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    const stop = new Date();
    stop.setHours(2, 0, 0, 0);
    const portions = splitDurationByLocalDays(start.getTime(), stop.getTime());
    expect(portions.length).toBeGreaterThanOrEqual(2);
    const total = portions.reduce(
      (sum: number, row: { durationMs: number }) => sum + row.durationMs,
      0
    );
    expect(total).toBe(4 * 60 * 60 * 1000);
  });
});
