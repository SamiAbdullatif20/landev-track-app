import { describe, expect, it } from "vitest";
import {
  computeMouseMovePercent,
  cursorTravelPx,
  isMouseActivePoll,
  isSignificantMouseMove,
  MOUSE_MOVE_THRESHOLD_PX
} from "./mouse-activity-metrics";

describe("mouse-activity-metrics", () => {
  it("requires meaningful travel distance", () => {
    expect(isSignificantMouseMove(MOUSE_MOVE_THRESHOLD_PX - 1)).toBe(false);
    expect(isSignificantMouseMove(MOUSE_MOVE_THRESHOLD_PX)).toBe(true);
  });

  it("counts wheel scroll as mouse activity", () => {
    expect(isMouseActivePoll(0, 1)).toBe(true);
    expect(isMouseActivePoll(0, 0)).toBe(false);
  });

  it("returns 0% when no mouse polls in the window", () => {
    const result = computeMouseMovePercent(
      { pollCount: 15, pollsWithSignificantMovement: 0 },
      15_000
    );
    expect(result.mouseMovePercent).toBe(0);
    expect(result.mouseActiveSeconds).toBe(0);
  });

  it("measures against full window time, not keyboard-only engaged ticks", () => {
    const result = computeMouseMovePercent(
      { pollCount: 15, pollsWithSignificantMovement: 3 },
      15_000
    );
    expect(result.mouseMovePercent).toBe(20);
    expect(result.mouseActiveSeconds).toBe(3);
  });

  it("matches ~1 min mouse in 18 min session when windows are mostly idle", () => {
    const windows = 72;
    const activeWindows = 4;
    const pollsPerWindow = 15;
    const mousePollsPerActiveWindow = 15;

    let totalMouseSeconds = 0;
    let totalWindowSeconds = 0;
    for (let i = 0; i < windows; i += 1) {
      const movement = i < activeWindows ? mousePollsPerActiveWindow : 0;
      const sample = computeMouseMovePercent(
        { pollCount: pollsPerWindow, pollsWithSignificantMovement: movement },
        15_000
      );
      totalMouseSeconds += sample.mouseActiveSeconds;
      totalWindowSeconds += 15;
    }

    const sessionPercent = (totalMouseSeconds / totalWindowSeconds) * 100;
    expect(sessionPercent).toBeGreaterThan(4);
    expect(sessionPercent).toBeLessThan(8);
  });

  it("does not exceed 100%", () => {
    const result = computeMouseMovePercent(
      { pollCount: 10, pollsWithSignificantMovement: 20 },
      10_000
    );
    expect(result.mouseMovePercent).toBe(100);
    expect(result.mouseMoveSamples).toBe(10);
  });

  it("computes cursor travel with hypot", () => {
    expect(cursorTravelPx(0, 0, 3, 4)).toBe(5);
  });
});
