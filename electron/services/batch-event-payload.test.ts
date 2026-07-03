import { describe, expect, it, vi } from "vitest";

vi.mock("../db/queue-repo", () => ({
  getSessionState: vi.fn(() => ({
    active: 1,
    sessionId: "ws-123",
    projectId: "proj-9",
    description: "test",
    startedAt: "2026-06-22T15:44:26.282Z"
  }))
}));

import {
  buildBatchPayloadFromQueuedEvent,
  effectiveActivityIntervalStartMs,
  filterSubsamplesForSessionSegment,
  normalizeQueuedBatchPayload
} from "./batch-event-payload";

describe("batch-event-payload", () => {
  it("clamps activity interval start to the session segment when stop/start splits a wall block", () => {
    const wallStartMs = Date.parse("2026-06-22T15:30:00.000Z");
    const segmentStartMs = Date.parse("2026-06-22T15:44:26.282Z");
    expect(effectiveActivityIntervalStartMs(wallStartMs, segmentStartMs)).toBe(segmentStartMs);
  });

  it("drops subsamples that ended before the current segment started", () => {
    const segmentStartMs = Date.parse("2026-06-22T15:44:26.282Z");
    const filtered = filterSubsamplesForSessionSegment(
      [
        { endedAtMs: Date.parse("2026-06-22T15:42:00.000Z"), trackedSeconds: 10 },
        { endedAtMs: Date.parse("2026-06-22T15:45:00.000Z"), trackedSeconds: 12 }
      ],
      segmentStartMs
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.trackedSeconds).toBe(12);
  });

  it("rewrites queued ACTIVITY_INTERVAL payloads that would collide on the server", () => {
    const normalized = normalizeQueuedBatchPayload(
      {
        sessionSegmentStartedAt: "2026-06-22T15:44:26.282Z",
        intervalStartAt: "2026-06-22T15:30:00.000Z",
        intervalEndAt: "2026-06-22T15:45:00.000Z",
        metadata: {
          intervalStartAt: "2026-06-22T15:30:00.000Z"
        }
      },
      "ACTIVITY_INTERVAL"
    );
    expect(normalized.intervalStartAt).toBe("2026-06-22T15:44:26.282Z");
    expect((normalized.metadata as Record<string, unknown>).intervalStartAt).toBe(
      "2026-06-22T15:44:26.282Z"
    );
  });

  it("builds batch payloads with normalized interval boundaries", () => {
    const payload = buildBatchPayloadFromQueuedEvent(
      {
        type: "ACTIVITY_INTERVAL",
        sessionSegmentStartedAt: "2026-06-22T15:44:26.282Z",
        intervalStartAt: "2026-06-22T15:30:00.000Z",
        intervalEndAt: "2026-06-22T15:45:00.000Z"
      },
      "uuid-1",
      "ACTIVITY_INTERVAL"
    );
    expect(payload.eventUuid).toBe("uuid-1");
    expect((payload as Record<string, unknown>).intervalStartAt).toBe(
      "2026-06-22T15:44:26.282Z"
    );
  });

  it("patches missing work session id from the active session at sync time", () => {
    const payload = buildBatchPayloadFromQueuedEvent(
      {
        type: "INPUT_ACTIVITY",
        mouseMovePercent: 42,
        occurredAt: "2026-06-22T15:45:00.000Z"
      },
      "uuid-2",
      "INPUT_ACTIVITY"
    );
    const built = payload as Record<string, unknown>;
    expect(built.sessionId).toBe("ws-123");
    expect(built.workSessionId).toBe("ws-123");
    expect(built.projectId).toBe("proj-9");
  });
});
