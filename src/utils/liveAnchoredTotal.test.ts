import { describe, expect, it, vi, afterEach } from "vitest";
import { computeLiveAnchoredMs } from "./liveAnchoredTotal";

describe("computeLiveAnchoredMs", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds elapsed time since anchor while tracking live", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T10:00:00.000Z"));
    const anchorAt = Date.now();
    vi.advanceTimersByTime(15_000);
    expect(computeLiveAnchoredMs(120_000, anchorAt, true)).toBe(135_000);
  });

  it("returns snapshot when not tracking live", () => {
    expect(computeLiveAnchoredMs(120_000, Date.now(), false)).toBe(120_000);
  });
});
