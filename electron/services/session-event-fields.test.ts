import { describe, expect, it } from "vitest";
import { buildWorkSessionEventFields, hasUsableWorkSessionId } from "./session-event-fields";

describe("session-event-fields", () => {
  it("rejects timestamp-like synthetic session ids", () => {
    expect(hasUsableWorkSessionId("1746123456789")).toBe(false);
    expect(hasUsableWorkSessionId("ws-real-uuid")).toBe(true);
  });

  it("includes segment start and work date on events", () => {
    const fields = buildWorkSessionEventFields({
      id: 1,
      active: 1,
      sessionId: "ws-abc",
      projectId: "proj-1",
      description: "Work",
      startedAt: "2026-05-19T09:00:00.000Z",
      updatedAt: "2026-05-19T09:00:00.000Z"
    });
    expect(fields.workSessionId).toBe("ws-abc");
    expect(fields.sessionId).toBe("ws-abc");
    expect(fields.sessionSegmentStartedAt).toBe("2026-05-19T09:00:00.000Z");
    expect(typeof fields.workDateKey).toBe("string");
    expect(fields.clientTimeZone).toBeTruthy();
  });
});
