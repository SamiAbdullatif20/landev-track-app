import { describe, expect, it } from "vitest";
import { buildScreenshotMultipartBody } from "./client";

describe("buildScreenshotMultipartBody", () => {
  it("builds multipart body from JPEG bytes without base64", () => {
    const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const { body, contentType } = buildScreenshotMultipartBody({
      capturedAt: "2026-06-16T12:00:00.000Z",
      imageBytes,
      mimeType: "image/jpeg",
      projectId: "proj-1",
      sessionId: "sess-1",
      metadata: { width: 1280, height: 720, uploadUuid: "shot-uuid-1" }
    });

    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(body.includes(imageBytes)).toBe(true);
    expect(body.toString("utf8")).toContain('name="capturedAt"');
    expect(body.toString("utf8")).toContain('filename="screenshot.jpg"');
    expect(body.toString("utf8")).toContain('"uploadUuid":"shot-uuid-1"');
    expect(body.length).toBeGreaterThan(imageBytes.length);
  });
});
