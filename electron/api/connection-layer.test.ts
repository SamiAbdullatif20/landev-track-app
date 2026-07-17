import { describe, expect, it } from "vitest";
import { API_ENDPOINTS } from "./endpoints";

describe("connection layer", () => {
  it("exposes auth and screenshot API endpoints", () => {
    expect(API_ENDPOINTS.auth.login).toBe("/api/auth/login");
    expect(API_ENDPOINTS.tracking.screenshotsSign).toBe("/api/tracking/screenshots/sign");
    expect(API_ENDPOINTS.tracking.screenshotsCommit).toBe("/api/tracking/screenshots/commit");
    expect(API_ENDPOINTS.tracking.eventsBatch).toBe("/api/tracking/events/batch");
  });
});
