import { describe, expect, it } from "vitest";
import {
  INPUT_ACTIVITY_POLL_MS,
  INPUT_ACTIVITY_SAMPLE_MS
} from "./input-activity-sampler";
import { MOUSE_POLL_INTERVAL_MS } from "./mouse-activity-metrics";

describe("activity sampling cadence", () => {
  it("keeps mouse metrics aligned with the sampler poll interval", () => {
    expect(MOUSE_POLL_INTERVAL_MS).toBe(INPUT_ACTIVITY_POLL_MS);
    expect(INPUT_ACTIVITY_SAMPLE_MS).toBe(15_000);
    expect(INPUT_ACTIVITY_SAMPLE_MS / INPUT_ACTIVITY_POLL_MS).toBeGreaterThanOrEqual(7);
  });
});
