import { describe, expect, it } from "vitest";
import { applyAntiCheatFilter } from "./activity-anti-cheat";

describe("activity-anti-cheat", () => {
  it("zeros repetitive clicking without keyboard or mouse movement", () => {
    const result = applyAntiCheatFilter({
      mouseMoveCount: 0,
      keyPressCount: 0,
      clickCount: 12,
      scrollCount: 0,
      mouseActiveSeconds: 2,
      activeSeconds: 2,
      windowSeconds: 15,
      pollTravelPx: []
    });

    expect(result.flags).toContain("repetitive_clicking");
    expect(result.validMouseSeconds).toBe(0);
    expect(result.validKeyboardSeconds).toBe(0);
  });

  it("flags artificial mouse movement in a tight drift band", () => {
    const result = applyAntiCheatFilter({
      mouseMoveCount: 12,
      keyPressCount: 0,
      clickCount: 0,
      scrollCount: 0,
      mouseActiveSeconds: 10,
      activeSeconds: 10,
      windowSeconds: 15,
      pollTravelPx: Array.from({ length: 10 }, () => 14)
    });

    expect(result.flags).toContain("artificial_mouse_movement");
    expect(result.validMouseSeconds).toBe(2);
  });

  it("keeps valid keyboard and mouse activity", () => {
    const result = applyAntiCheatFilter({
      mouseMoveCount: 5,
      keyPressCount: 8,
      clickCount: 2,
      scrollCount: 1,
      mouseActiveSeconds: 6,
      activeSeconds: 12,
      windowSeconds: 15,
      pollTravelPx: [40, 30, 25, 18]
    });

    expect(result.flags).toEqual([]);
    expect(result.validKeyboardSeconds).toBe(12);
    expect(result.validMouseSeconds).toBe(6);
  });
});
