import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCapturePrimaryScreenJpeg = vi.fn();
const mockShouldSkipScreenshotCapture = vi.fn();

vi.mock("../db/queue-repo", () => ({
  getSessionState: () => ({ active: 1 })
}));

vi.mock("./capture-guard-windows", () => ({
  shouldSkipScreenshotCapture: () => mockShouldSkipScreenshotCapture()
}));

vi.mock("./input-activity-rollup", () => ({
  getMouseStatsForPeriod: () => ({
    mouseMovePercent: 50,
    mouseActiveSeconds: 30,
    activityPeriodSeconds: 600,
    activityPeriodStartAt: "2026-06-23T10:00:00.000Z",
    activityPeriodEndAt: "2026-06-23T10:10:00.000Z",
    sampleCount: 40
  })
}));

vi.mock("./screenshot-capture", () => ({
  CAPTURE_SIZES: [{ width: 480, height: 270 }],
  capturePrimaryScreenJpeg: (...args: unknown[]) => mockCapturePrimaryScreenJpeg(...args)
}));

vi.mock("./screenshot-compress", () => ({
  TARGET_SCREENSHOT_BYTES: 150_000
}));

vi.mock("../utils/memory-trim", () => ({
  trimWorkingSetAfterHeavyWork: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../config/client-timezone", () => ({
  getClientIanaTimeZone: () => "UTC"
}));

import { ScreenshotWorker } from "./screenshot-worker";
import type { ScreenshotSchedule } from "./screenshot-schedules";
import { scheduleForVisibility } from "./screenshot-schedules";

const primaryCapture = {
  buffer: Buffer.from([1, 2, 3]),
  width: 480,
  height: 270,
  quality: 55,
  sourceId: "gdi:primary",
  sourceName: "Primary Display",
  compressedBytes: 3
};

describe("ScreenshotWorker primary capture", () => {
  beforeEach(() => {
    mockShouldSkipScreenshotCapture.mockResolvedValue({
      shouldSkipCapture: false,
      reason: null,
      processName: null,
      windowTitle: null
    });
    mockCapturePrimaryScreenJpeg.mockReset();
    mockCapturePrimaryScreenJpeg.mockResolvedValue(primaryCapture);
  });

  it("uploads a single primary-display screenshot per schedule tick", async () => {
    const uploads: Array<{ metadata?: { displayIndex?: number; displayCount?: number } }> = [];
    const worker = new ScreenshotWorker({
      uploadScreenshot: async (payload) => {
        uploads.push(payload);
      }
    });

    await worker.start({ projectId: "proj-1", sessionId: "sess-1" });

    const schedule = scheduleForVisibility("admin_and_employee");
    expect(schedule).not.toBeNull();

    const captureAndUpload = (
      worker as unknown as {
        captureAndUpload: (schedule: ScreenshotSchedule, cadenceTargetMs: number) => Promise<void>;
      }
    ).captureAndUpload.bind(worker);
    await captureAndUpload(schedule!, 600_000);

    worker.stop();

    expect(mockCapturePrimaryScreenJpeg).toHaveBeenCalledTimes(1);
    expect(uploads).toHaveLength(1);
    expect(uploads[0]?.metadata?.displayIndex).toBe(0);
    expect(uploads[0]?.metadata?.displayCount).toBe(1);
  });

  it("captures once when admin and employee schedules are both due", async () => {
    const uploads: Array<{ metadata?: { visibility?: string } }> = [];
    const worker = new ScreenshotWorker({
      uploadScreenshot: async (payload) => {
        uploads.push(payload);
      }
    });

    await worker.start({ projectId: "proj-1", sessionId: "sess-1" });

    const superadmin = scheduleForVisibility("superadmin_only");
    const employee = scheduleForVisibility("admin_and_employee");
    expect(superadmin).not.toBeNull();
    expect(employee).not.toBeNull();

    const captureAndUploadSchedules = (
      worker as unknown as {
        captureAndUploadSchedules: (
          due: Array<{ schedule: ScreenshotSchedule; cadenceTargetMs: number }>
        ) => Promise<void>;
      }
    ).captureAndUploadSchedules.bind(worker);

    await captureAndUploadSchedules([
      { schedule: superadmin!, cadenceTargetMs: 360_000 },
      { schedule: employee!, cadenceTargetMs: 600_000 }
    ]);

    worker.stop();

    expect(mockCapturePrimaryScreenJpeg).toHaveBeenCalledTimes(1);
    expect(uploads).toHaveLength(2);
    expect(uploads.map((entry) => entry.metadata?.visibility).sort()).toEqual([
      "admin_and_employee",
      "superadmin_only"
    ]);
  });
});
