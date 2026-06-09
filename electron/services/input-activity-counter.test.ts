import { describe, expect, it } from "vitest";
import { InputActivityCounter } from "./input-activity-counter";

describe("InputActivityCounter", () => {
  it("counts mouse moves and key presses between drains", () => {
    const counter = new InputActivityCounter();
    counter.ingest({ x: 0, y: 0, keysDown: [], idleMs: 0, mouseMoveDistancePx: 0, clickCount: 0, scrollCount: 0 });
    counter.ingest({ x: 15, y: 0, keysDown: [], idleMs: 0, mouseMoveDistancePx: 15, clickCount: 0, scrollCount: 1 });
    counter.ingest({ x: 15, y: 0, keysDown: [65], idleMs: 0, mouseMoveDistancePx: 0, clickCount: 2, scrollCount: 0 });
    const first = counter.drain();
    expect(first.mouseMoveCount).toBe(1);
    expect(first.keyPressCount).toBe(1);
    expect(first.clickCount).toBe(2);
    expect(first.scrollCount).toBe(1);
    counter.ingest({ x: 15, y: 0, keysDown: [65], idleMs: 0, mouseMoveDistancePx: 0, clickCount: 0, scrollCount: 0 });
    const second = counter.drain();
    expect(second.mouseMoveCount).toBe(0);
    expect(second.keyPressCount).toBe(0);
  });
});
