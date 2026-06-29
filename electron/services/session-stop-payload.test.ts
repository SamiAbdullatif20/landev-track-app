import { describe, expect, it, vi } from "vitest";

vi.mock("../security/device-identity", () => ({
  getDeviceUuid: () => "device-test-uuid"
}));

import {
  buildSessionStartTrailingEvent,
  buildSessionStopInput,
  buildSessionStopTrailingEvent
} from "./session-stop-payload";
import type { SessionState } from "../db/index";

const baseState: SessionState = {
  id: 1,
  active: 1,
  sessionId: "ws-123",
  projectId: "proj-1",
  description: "Work",
  startedAt: "2026-06-02T08:00:00.000Z",
  updatedAt: "2026-06-02T08:00:00.000Z"
};

describe("session-stop-payload", () => {
  it("builds trailing SESSION_START event", () => {
    const event = buildSessionStartTrailingEvent("2026-06-02T08:00:00.000Z", "2026-06-02");
    expect(event.eventKind).toBe("SESSION_START");
    expect(event.source).toBe("DESKTOP_AGENT");
    expect(event.occurredAtIso).toBe("2026-06-02T08:00:00.000Z");
    expect(event.workDateKey).toBe("2026-06-02");
  });

  it("builds trailing SESSION_STOP event", () => {
    const event = buildSessionStopTrailingEvent("2026-06-02T10:00:00.000Z", "2026-06-02");
    expect(event.eventKind).toBe("SESSION_STOP");
    expect(event.source).toBe("DESKTOP_AGENT");
    expect(event.occurredAtIso).toBe("2026-06-02T10:00:00.000Z");
    expect(event.workDateKey).toBe("2026-06-02");
    expect(event.eventUuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("includes device, timezone, and duration fields for stop API", () => {
    const payload = buildSessionStopInput(baseState, "2026-06-02T10:00:00.000Z");
    expect(payload.sessionId).toBe("ws-123");
    expect(payload.startedAt).toBe("2026-06-02T08:00:00.000Z");
    expect(payload.sessionSegmentStartedAt).toBe("2026-06-02T08:00:00.000Z");
    expect(payload.durationMs).toBe(2 * 60 * 60 * 1000);
    expect(payload.clientTimeZone).toBeTruthy();
    expect(payload.timezone).toBe(payload.clientTimeZone);
    expect(payload.deviceUuid).toBeTruthy();
    expect(payload.trailingEvents).toHaveLength(1);
    expect(payload.trailingEvents?.[0]?.eventKind).toBe("SESSION_STOP");
    expect(payload.stopReason).toBe("USER");
  });

  it("marks inactivity auto-stop on payload and trailing metadata", () => {
    const payload = buildSessionStopInput(baseState, "2026-06-02T10:00:00.000Z", {
      stopReason: "INACTIVITY_AUTO",
      inactivityWorkActivityPercent: 2.5
    });
    expect(payload.stopReason).toBe("INACTIVITY_AUTO");
    expect(payload.trailingEvents?.[0]?.metadata).toMatchObject({
      stopReason: "INACTIVITY_AUTO",
      workActivityPercent: 2.5
    });
  });
});
