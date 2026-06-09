import { describe, expect, it } from "vitest";

// buildSessionStopBody is module-private; mirror expected output shape here via duplicated minimal builder test
// by importing stopSession's input type and testing payload builder in session-stop-payload.test.ts instead.

import { buildSessionStopInput } from "../services/session-stop-payload";
import type { SessionState } from "../db/index";
import { vi } from "vitest";

vi.mock("../security/device-identity", () => ({
  getDeviceUuid: () => "device-abc"
}));

describe("session stop API payload shape", () => {
  it("includes timezone aliases and trailing SESSION_STOP", () => {
    const state: SessionState = {
      id: 1,
      active: 1,
      sessionId: "ws-1",
      projectId: "p1",
      description: "d",
      startedAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z"
    };
    const payload = buildSessionStopInput(state, "2026-06-02T09:30:00.000Z");
    expect(payload.timezone).toBe(payload.clientTimeZone);
    expect(payload.deviceUuid).toBe("device-abc");
    expect(payload.trailingEvents?.[0]).toMatchObject({
      eventKind: "SESSION_STOP",
      source: "DESKTOP_AGENT",
      occurredAtIso: "2026-06-02T09:30:00.000Z"
    });
  });
});
