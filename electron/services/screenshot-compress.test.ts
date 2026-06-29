import { describe, expect, it } from "vitest";
import {
  computeScaledDimensions,
  PREFERRED_JPEG_QUALITY,
  SCREENSHOT_CAPTURE_MAX_WIDTH,
  SCREENSHOT_MAX_UPLOAD_WIDTH,
  TARGET_SCREENSHOT_BYTES
} from "./screenshot-compress";

describe("screenshot-compress", () => {
  it("uses a low RAM byte budget and moderate JPEG quality", () => {
    expect(PREFERRED_JPEG_QUALITY).toBeLessThanOrEqual(60);
    expect(TARGET_SCREENSHOT_BYTES).toBeLessThanOrEqual(200 * 1024);
    expect(SCREENSHOT_CAPTURE_MAX_WIDTH).toBeLessThanOrEqual(480);
  });

  it("downscales wide captures before JPEG encoding", () => {
    expect(computeScaledDimensions(1920, 1080, SCREENSHOT_MAX_UPLOAD_WIDTH)).toEqual({
      width: 800,
      height: 450
    });
    expect(computeScaledDimensions(1280, 720, SCREENSHOT_CAPTURE_MAX_WIDTH)).toEqual({
      width: 480,
      height: 270
    });
  });
});
