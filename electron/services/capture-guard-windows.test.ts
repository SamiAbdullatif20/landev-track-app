import { beforeEach, describe, expect, it, vi } from "vitest";
import { shouldSkipScreenshotCapture } from "./capture-guard-windows";
import * as activityMetadata from "./activity-metadata";

describe("capture guard windows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips capture while snipping tool is active", async () => {
    vi.spyOn(activityMetadata, "collectActivityContext").mockResolvedValue({
      platform: "win32",
      collectedAt: new Date().toISOString(),
      processName: "SnippingTool.exe",
      windowTitle: "Snipping Tool"
    });

    const result = await shouldSkipScreenshotCapture();
    expect(result.shouldSkipCapture).toBe(true);
    expect(result.reason).toBe("snipping_tool_active");
  });

  it("skips capture while recording tools are active", async () => {
    vi.spyOn(activityMetadata, "collectActivityContext").mockResolvedValue({
      platform: "win32",
      collectedAt: new Date().toISOString(),
      processName: "obs64.exe",
      windowTitle: "OBS Studio"
    });

    const result = await shouldSkipScreenshotCapture();
    expect(result.shouldSkipCapture).toBe(true);
    expect(result.reason).toBe("screen_recording_active");
  });
});
