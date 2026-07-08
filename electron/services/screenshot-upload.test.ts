import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";

const mocks = vi.hoisted(() => ({
  uploadScreenshotDirect: vi.fn(),
  ingestScreenshot: vi.fn()
}));

vi.mock("./screenshot-direct-upload", () => ({
  uploadScreenshotDirect: mocks.uploadScreenshotDirect
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    ingestScreenshot: mocks.ingestScreenshot
  };
});

vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { uploadScreenshot } from "./screenshot-upload";

const basePayload = {
  capturedAt: "2026-07-05T12:00:00.000Z",
  imageBytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  mimeType: "image/jpeg" as const,
  projectId: "123",
  sessionId: "456",
  metadata: {
    uploadUuid: "550e8400-e29b-41d4-a716-446655440000"
  }
};

describe("uploadScreenshot", () => {
  beforeEach(() => {
    mocks.uploadScreenshotDirect.mockReset();
    mocks.ingestScreenshot.mockReset();
  });

  it("returns direct when sign → Supabase → commit succeeds", async () => {
    mocks.uploadScreenshotDirect.mockResolvedValue({
      uploadUuid: "550e8400-e29b-41d4-a716-446655440000",
      path: "screenshots/shot.jpg"
    });

    const result = await uploadScreenshot(basePayload, {});

    expect(result).toEqual({
      uploadUuid: "550e8400-e29b-41d4-a716-446655440000",
      method: "direct"
    });
    expect(mocks.ingestScreenshot).not.toHaveBeenCalled();
  });

  it("falls back to multipart ingest when direct Supabase upload fails", async () => {
    mocks.uploadScreenshotDirect.mockRejectedValue(new Error("Request failed with status code 403"));
    mocks.ingestScreenshot.mockResolvedValue(undefined);

    const result = await uploadScreenshot(basePayload, {});

    expect(result.method).toBe("multipart");
    expect(mocks.ingestScreenshot).toHaveBeenCalledWith(basePayload, {});
  });

  it("rethrows 413 without trying multipart", async () => {
    mocks.uploadScreenshotDirect.mockRejectedValue(
      new ApiError("validation", "too large", { statusCode: 413 })
    );

    await expect(uploadScreenshot(basePayload, {})).rejects.toBeInstanceOf(ApiError);
    expect(mocks.ingestScreenshot).not.toHaveBeenCalled();
  });
});
