import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import type { ScreenshotUploadInput } from "./screenshot-worker";

const mocks = vi.hoisted(() => ({
  enqueueScreenshot: vi.fn(() => "queued-uuid"),
  uploadScreenshot: vi.fn()
}));

vi.mock("../db/screenshot-queue", () => ({
  enqueueScreenshot: mocks.enqueueScreenshot
}));

vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("./screenshot-upload", () => ({
  uploadScreenshot: mocks.uploadScreenshot
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual
  };
});

import { uploadScreenshotOrEnqueue } from "./screenshot-upload-or-queue";

const basePayload: ScreenshotUploadInput = {
  capturedAt: "2026-06-02T10:00:00.000Z",
  imageBytes: Buffer.from([0xff, 0xd8]),
  mimeType: "image/jpeg",
  projectId: "proj-1",
  sessionId: "sess-1",
  metadata: {
    width: 800,
    height: 600,
    source: "test",
    clientTimeZone: "UTC",
    intervalMinutes: 6,
    visibility: "superadmin_only",
    visibleToRoles: ["superadmin"]
  }
};

describe("uploadScreenshotOrEnqueue", () => {
  beforeEach(() => {
    mocks.uploadScreenshot.mockReset();
    mocks.enqueueScreenshot.mockClear();
  });

  it("passes uploadUuid to live upload on success", async () => {
    mocks.uploadScreenshot.mockResolvedValue({ uploadUuid: "u1", method: "direct" });
    await uploadScreenshotOrEnqueue(basePayload, {});
    const payload = mocks.uploadScreenshot.mock.calls[0]?.[0] as {
      metadata: { uploadUuid: string };
    };
    expect(typeof payload.metadata.uploadUuid).toBe("string");
    expect(mocks.enqueueScreenshot).not.toHaveBeenCalled();
  });

  it("enqueues on network failure without throwing", async () => {
    mocks.uploadScreenshot.mockRejectedValue(new ApiError("network", "offline"));
    await expect(uploadScreenshotOrEnqueue(basePayload, {})).resolves.toBeUndefined();
    expect(mocks.enqueueScreenshot).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({ uploadUuid: expect.any(String) })
    );
  });

  it("rethrows 413 so the worker can capture a smaller JPEG", async () => {
    mocks.uploadScreenshot.mockRejectedValue(
      new ApiError("validation", "too large", { statusCode: 413 })
    );
    await expect(uploadScreenshotOrEnqueue(basePayload, {})).rejects.toBeInstanceOf(ApiError);
    expect(mocks.enqueueScreenshot).not.toHaveBeenCalled();
  });
});
