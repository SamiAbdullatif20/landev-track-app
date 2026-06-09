import { describe, expect, it } from "vitest";
import {
  formatWorkDateKeyAt,
  getWorkDayOverlapMs,
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
});
