import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db/queue-repo", () => ({
  getSessionState: () => ({
    active: 1,
    projectId: "proj-1",
    description: "test",
    startedAt: "2026-06-02T10:00:00.000Z",
    sessionId: "sess-1"
  }),
  enqueueEvent: vi.fn()
}));

vi.mock("./tracking-agent-flags", () => ({
  QUEUE_AGENT_EVENTS_FOR_SYNC: true
}));

import { enqueueEvent } from "../db/queue-repo";
import {
  emitActivityStart,
  emitAppChange,
  emitHeartbeat,
  emitIdleStart
} from "./tracking-agent-events";

describe("tracking-agent-events", () => {
  beforeEach(() => {
    vi.mocked(enqueueEvent).mockClear();
  });

  it("emits timestamp-only activity_start without duration fields", () => {
    emitActivityStart();
    expect(enqueueEvent).toHaveBeenCalledWith(
      "ACTIVITY_START",
      expect.objectContaining({
        eventKind: "ACTIVITY_START",
        occurredAt: expect.any(String)
      })
    );
    const payload = vi.mocked(enqueueEvent).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.activeSeconds).toBeUndefined();
    expect(payload.trackerElapsedMs).toBeUndefined();
  });

  it("emits app_change with app metadata and no activeSeconds", () => {
    emitAppChange({
      platform: "win32",
      collectedAt: new Date().toISOString(),
      processName: "chrome",
      application: "chrome",
      appName: "chrome",
      windowTitle: "Docs",
      activeWindowTitle: "Docs",
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      processId: 123,
      hasForegroundWindowHandle: true
    });
    const payload = vi.mocked(enqueueEvent).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.eventKind).toBe("APP_CHANGE");
    expect(payload.processName).toBe("chrome.exe");
    expect(payload.activeSeconds).toBeUndefined();
  });

  it("emits idle_start with system idle ms", () => {
    emitIdleStart(310_000);
    const payload = vi.mocked(enqueueEvent).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.eventKind).toBe("IDLE_START");
    expect(payload.systemIdleMs).toBe(310_000);
  });

  it("emits heartbeat with system idle ms only", () => {
    emitHeartbeat(null, 12_000);
    const payload = vi.mocked(enqueueEvent).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.eventKind).toBe("HEARTBEAT");
    expect(payload.systemIdleMs).toBe(12_000);
    expect(payload.activeSeconds).toBeUndefined();
  });
});
