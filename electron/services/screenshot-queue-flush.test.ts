import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import type { QueuedScreenshotRow } from "../db/screenshot-queue";

const mocks = vi.hoisted(() => ({
  getPendingScreenshots: vi.fn<() => QueuedScreenshotRow[]>(),
  markScreenshotDelivered: vi.fn(),
  markScreenshotForRetry: vi.fn(() => "2026-06-02T12:00:00.000Z"),
  quarantineScreenshot: vi.fn(),
  uploadScreenshot: vi.fn()
}));

vi.mock("../db/screenshot-queue", () => ({
  getPendingScreenshots: mocks.getPendingScreenshots,
  markScreenshotDelivered: mocks.markScreenshotDelivered,
  markScreenshotForRetry: mocks.markScreenshotForRetry,
  quarantineScreenshot: mocks.quarantineScreenshot,
  MAX_SCREENSHOT_UPLOAD_ATTEMPTS: 12
}));

vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: () => true,
    readFileSync: () => Buffer.from([1, 2, 3])
  }
}));

vi.mock("./auth-session", () => ({
  isAuthenticated: () => true
}));

vi.mock("./screenshot-upload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./screenshot-upload")>();
  return {
    ...actual,
    uploadScreenshot: mocks.uploadScreenshot
  };
});

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual
  };
});

import { flushScreenshotQueue } from "./screenshot-queue-flush";

function queuedRow(overrides: Partial<QueuedScreenshotRow> = {}): QueuedScreenshotRow {
  return {
    id: 1,
    uploadUuid: "shot-1",
    filePath: "C:\\tmp\\shot-1.jpg",
    capturedAt: "2026-06-02T10:00:00.000Z",
    projectId: "p1",
    sessionId: "s1",
    metadataJson: JSON.stringify({ width: 100, uploadUuid: "shot-1" }),
    mimeType: "image/jpeg",
    createdAt: "2026-06-02T10:00:00.000Z",
    attempts: 0,
    nextRunAt: null,
    status: "pending",
    ...overrides
  };
}

describe("flushScreenshotQueue", () => {
  beforeEach(() => {
    mocks.uploadScreenshot.mockReset();
    mocks.getPendingScreenshots.mockReset();
    mocks.markScreenshotDelivered.mockReset();
    mocks.markScreenshotForRetry.mockReset();
    mocks.quarantineScreenshot.mockReset();
  });

  it("uploads pending screenshots oldest-first and clears the queue", async () => {
    mocks.getPendingScreenshots.mockReturnValue([queuedRow()]);
    mocks.uploadScreenshot.mockResolvedValue({ uploadUuid: "shot-1", method: "multipart" });

    const result = await flushScreenshotQueue({}, 5);

    expect(result).toEqual({ uploaded: 1, failed: 0 });
    expect(mocks.uploadScreenshot).toHaveBeenCalledTimes(1);
    const payload = mocks.uploadScreenshot.mock.calls[0]?.[0] as {
      metadata: { uploadUuid: string };
    };
    expect(payload.metadata.uploadUuid).toBe("shot-1");
    expect(mocks.markScreenshotDelivered).toHaveBeenCalledWith(1, "C:\\tmp\\shot-1.jpg");
  });

  it("quarantines after repeated backend auth failures", async () => {
    mocks.getPendingScreenshots.mockReturnValue([queuedRow({ attempts: 2 })]);
    mocks.uploadScreenshot.mockRejectedValue(
      new ApiError("auth", "forbidden", { statusCode: 403 })
    );

    const result = await flushScreenshotQueue({}, 5);

    expect(result).toEqual({ uploaded: 0, failed: 1 });
    expect(mocks.quarantineScreenshot).toHaveBeenCalledWith(1, "C:\\tmp\\shot-1.jpg", "auth_forbidden");
    expect(mocks.markScreenshotForRetry).not.toHaveBeenCalled();
  });

  it("keeps failed uploads pending with retry status", async () => {
    mocks.getPendingScreenshots.mockReturnValue([queuedRow({ uploadUuid: "shot-fail" })]);
    mocks.uploadScreenshot.mockRejectedValue(new ApiError("network", "offline"));

    const result = await flushScreenshotQueue({}, 5);

    expect(result).toEqual({ uploaded: 0, failed: 1 });
    expect(mocks.markScreenshotForRetry).toHaveBeenCalledWith(1, 1);
  });
});
