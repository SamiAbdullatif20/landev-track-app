import { describe, expect, it } from "vitest";
import {
  computeScaledDimensions,
  PREFERRED_JPEG_QUALITY,
  SCREENSHOT_MAX_UPLOAD_WIDTH,
  TARGET_SCREENSHOT_BYTES
} from "./screenshot-compress";

describe("screenshot-compress", () => {
  it("keeps a high preferred JPEG quality and reasonable upload byte budget", () => {
    expect(PREFERRED_JPEG_QUALITY).toBeGreaterThanOrEqual(85);
    expect(TARGET_SCREENSHOT_BYTES).toBeGreaterThan(400 * 1024);
    expect(TARGET_SCREENSHOT_BYTES).toBeLessThan(800 * 1024);
  });

  it("downscales wide captures before JPEG encoding", () => {
    expect(computeScaledDimensions(1920, 1080, SCREENSHOT_MAX_UPLOAD_WIDTH)).toEqual({
      width: 1600,
      height: 900
    });
    expect(computeScaledDimensions(1280, 720, SCREENSHOT_MAX_UPLOAD_WIDTH)).toEqual({
      width: 1280,
      height: 720
    });
  });
});
