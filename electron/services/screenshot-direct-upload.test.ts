import axios, { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";

const mocks = vi.hoisted(() => ({
  signScreenshotUpload: vi.fn(),
  commitScreenshotMetadata: vi.fn()
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    signScreenshotUpload: mocks.signScreenshotUpload,
    commitScreenshotMetadata: mocks.commitScreenshotMetadata
  };
});

vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { uploadScreenshotDirect } from "./screenshot-direct-upload";

const signResult = {
  path: "screenshots/42/2026-07-05/shot.jpg",
  token: "token-abc",
  signedUrl: "https://example.supabase.co/storage/v1/object/upload/sign/shot.jpg",
  uploadUuid: "550e8400-e29b-41d4-a716-446655440000",
  mimeType: "image/jpeg" as const,
  capturedAtIso: "2026-07-05T12:00:00.000Z"
};

const basePayload = {
  capturedAt: "2026-07-05T12:00:00.000Z",
  imageBytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  mimeType: "image/jpeg" as const,
  projectId: "123",
  sessionId: "456",
  metadata: {
    width: 1920,
    height: 1080,
    source: "desktop",
    uploadUuid: "550e8400-e29b-41d4-a716-446655440000"
  }
};

describe("uploadScreenshotDirect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.signScreenshotUpload.mockReset();
    mocks.commitScreenshotMetadata.mockReset();
    vi.spyOn(axios, "put").mockResolvedValue({ status: 200, data: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses sign → Supabase upload → commit", async () => {
    mocks.signScreenshotUpload.mockResolvedValue(signResult);
    mocks.commitScreenshotMetadata.mockResolvedValue({ duplicate: false, screenshotId: "s1" });

    const result = await uploadScreenshotDirect(basePayload, {});

    expect(result.uploadUuid).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(mocks.signScreenshotUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadUuid: "550e8400-e29b-41d4-a716-446655440000",
        mimeType: "image/jpeg",
        byteSize: basePayload.imageBytes.length,
        projectId: "123",
        sessionId: "456"
      }),
      {}
    );
    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(mocks.commitScreenshotMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        path: signResult.path,
        uploadUuid: "550e8400-e29b-41d4-a716-446655440000",
        projectId: "123",
        sessionId: "456"
      }),
      {}
    );
  });

  it("treats duplicate commit as success", async () => {
    mocks.signScreenshotUpload.mockResolvedValue(signResult);
    mocks.commitScreenshotMetadata.mockResolvedValue({ duplicate: true, screenshotId: "s1" });

    await expect(uploadScreenshotDirect(basePayload, {})).resolves.toEqual({
      uploadUuid: "550e8400-e29b-41d4-a716-446655440000",
      path: signResult.path
    });
  });

  it("rethrows 403 from sign", async () => {
    mocks.signScreenshotUpload.mockRejectedValue(
      new ApiError("auth", "forbidden", { statusCode: 403 })
    );

    await expect(uploadScreenshotDirect(basePayload, {})).rejects.toBeInstanceOf(ApiError);
  });

  it("throws when sign returns 500 instead of sending image through Vercel", async () => {
    mocks.signScreenshotUpload.mockRejectedValue(
      new ApiError("server", "supabase not configured", { statusCode: 500 })
    );

    const pending = expect(uploadScreenshotDirect(basePayload, {})).rejects.toBeInstanceOf(ApiError);
    await vi.runAllTimersAsync();
    await pending;
    expect(mocks.commitScreenshotMetadata).not.toHaveBeenCalled();
  });

  it("falls back to bearer auth when query-token PUT returns 403", async () => {
    mocks.signScreenshotUpload.mockResolvedValue(signResult);
    mocks.commitScreenshotMetadata.mockResolvedValue({ duplicate: false, screenshotId: "s1" });
    const putMock = vi.spyOn(axios, "put");
    const forbidden = new AxiosError("Request failed with status code 403");
    forbidden.response = {
      status: 403,
      data: {},
      headers: {},
      statusText: "Forbidden",
      config: { headers: new axios.AxiosHeaders() }
    };
    putMock
      .mockRejectedValueOnce(forbidden)
      .mockRejectedValueOnce(forbidden)
      .mockResolvedValueOnce({ status: 200, data: {} });

    await uploadScreenshotDirect(basePayload, {});

    expect(putMock).toHaveBeenCalledTimes(3);
    expect(putMock.mock.calls[2]?.[2]?.headers?.Authorization).toBe("Bearer token-abc");
  });

  it("throws when Supabase upload fails after retries", async () => {
    mocks.signScreenshotUpload.mockResolvedValue(signResult);
    vi.spyOn(axios, "put").mockRejectedValue(new Error("network down"));
    vi.spyOn(axios, "post").mockRejectedValue(new Error("network down"));

    const pending = expect(uploadScreenshotDirect(basePayload, {})).rejects.toThrow("network down");
    await vi.runAllTimersAsync();
    await pending;
    expect(mocks.commitScreenshotMetadata).not.toHaveBeenCalled();
  });
});
