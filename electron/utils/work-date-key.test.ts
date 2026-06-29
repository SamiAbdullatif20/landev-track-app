import { describe, expect, it } from "vitest";
import {
  clipRangeToWorkDay,
  formatWorkDateKeyAt,
  getWorkDayOverlapMs,
  mergeIntervalsTotalMs,
  nextWorkDateKey,
  resolveWorkDayStartMs
} from "./work-date-key";

describe("work-date-key overlap", () => {
  const nz = "Pacific/Auckland";

  it("returns full range when session is within one local day", () => {
    const day = "2026-06-02";
    const startMs = resolveWorkDayStartMs(day, nz) + 2 * 3_600_000;
    const endMs = startMs + 3 * 3_600_000;
    const overlap = getWorkDayOverlapMs(
      new Date(startMs).toISOString(),
      new Date(endMs).toISOString(),
      day,
      nz
    );
    expect(overlap).toBe(3 * 3_600_000);
  });

  it("splits a session that crosses local midnight", () => {
    const day = "2026-06-02";
    const dayStart = resolveWorkDayStartMs(day, nz);
    const nextDay = nextWorkDateKey(day);
    const nextStart = resolveWorkDayStartMs(nextDay, nz);
    const spanMs = nextStart - dayStart;
    const overlap = getWorkDayOverlapMs(
      new Date(dayStart - 2 * 3_600_000).toISOString(),
      new Date(dayStart + 2 * 3_600_000).toISOString(),
      day,
      nz
    );
    expect(overlap).toBe(2 * 3_600_000);
    expect(overlap).toBeLessThan(spanMs);
  });

  it("formats stable YYYY-MM-DD keys", () => {
    expect(formatWorkDateKeyAt(Date.parse("2026-05-20T12:00:00.000Z"), "UTC")).toBe("2026-05-20");
  });

  it("merges overlapping intervals without double counting", () => {
    expect(
      mergeIntervalsTotalMs([
        { startMs: 0, endMs: 3_600_000 },
        { startMs: 1_800_000, endMs: 5_400_000 }
      ])
    ).toBe(5_400_000);
  });

  it("clips ranges to a work day", () => {
    const day = "2026-06-02";
    const dayStart = resolveWorkDayStartMs(day, nz);
    const clipped = clipRangeToWorkDay(
      new Date(dayStart - 3_600_000).toISOString(),
      new Date(dayStart + 2 * 3_600_000).toISOString(),
      day,
      nz
    );
    expect(clipped).toEqual({
      startMs: dayStart,
      endMs: dayStart + 2 * 3_600_000
    });
  });
});
