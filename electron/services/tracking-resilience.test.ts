import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type TrackingBatchEventInput } from "../api/client";
import type { QueuedEvent } from "../db/index";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp/landev-test" }
}));

const markEventDelivered = vi.fn();
const markEventsDelivered = vi.fn();
const markEventForRetry = vi.fn((_id: number, _attempts: number) => "2026-06-02T12:00:00.000Z");

vi.mock("../db/queue-repo", () => ({
  markEventDelivered: (id: number) => markEventDelivered(id),
  markEventsDelivered: (ids: number[]) => markEventsDelivered(ids),
  markEventForRetry: (id: number, attempts: number) => markEventForRetry(id, attempts)
}));

vi.mock("../db/screenshot-queue", () => ({
  getPendingScreenshotCount: () => 0
}));

vi.mock("./screenshot-queue-flush", () => ({
  flushScreenshotQueue: vi.fn(async () => ({ uploaded: 0, failed: 0 }))
}));

vi.mock("./auth-session", () => ({
  readAuthContext: () => ({ token: "t" }),
  refreshAuthSession: vi.fn()
}));

vi.mock("./desktop-notifications", () => ({
  notifyDesktop: vi.fn()
}));

vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const ingestEventsBatch = vi.fn();

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    ingestEventsBatch: (...args: unknown[]) => ingestEventsBatch(...args)
  };
});

import {
  MAX_SYNC_ATTEMPTS,
  syncPreparedQueuedEvents,
  uploadPreparedQueuedEvents
} from "./sync-worker";

function batchPayload(eventUuid: string, eventKind: string): TrackingBatchEventInput {
  return {
    eventUuid,
    eventKind,
    type: eventKind,
    occurredAt: "2026-06-02T10:00:00.000Z"
  };
}

function queuedEvent(overrides: Partial<QueuedEvent> = {}): QueuedEvent {
  return {
    id: 1,
    eventUuid: "evt-1",
    eventKind: "APP_FOCUS",
    payloadJson: JSON.stringify({ type: "APP_FOCUS" }),
    createdAt: "2026-06-02T09:00:00.000Z",
    attempts: 0,
    nextRunAt: null,
    status: "pending",
    ...overrides
  };
}

describe("tracking resilience — event batch sync", () => {
  beforeEach(() => {
    markEventDelivered.mockClear();
    markEventsDelivered.mockClear();
    markEventForRetry.mockClear();
    ingestEventsBatch.mockReset();
  });

  it("delivers a full batch and marks all events delivered", async () => {
    ingestEventsBatch.mockResolvedValue(undefined);
    const event = queuedEvent();
    const prepared = [{ event, payload: batchPayload(event.eventUuid, event.eventKind) }];

    const result = await syncPreparedQueuedEvents(prepared, {});

    expect(result.deliveredIds).toEqual([1]);
    expect(markEventsDelivered).toHaveBeenCalledWith([1]);
  });

  it("retries one event at a time after a batch failure", async () => {
    ingestEventsBatch
      .mockRejectedValueOnce(new ApiError("server", "batch failed"))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError("network", "offline"));

    const good = queuedEvent({ id: 1, eventUuid: "good" });
    const bad = queuedEvent({ id: 2, eventUuid: "bad", attempts: 0 });
    const prepared = [
      { event: good, payload: batchPayload("good", "APP_FOCUS") },
      { event: bad, payload: batchPayload("bad", "INPUT_ACTIVITY") }
    ];

    await expect(syncPreparedQueuedEvents(prepared, {})).rejects.toBeInstanceOf(ApiError);
    expect(markEventDelivered).toHaveBeenCalledWith(1);
    expect(markEventForRetry).toHaveBeenCalledWith(2, 1);
  });

  it("quarantines events that exceeded max attempts", async () => {
    ingestEventsBatch.mockResolvedValue(undefined);
    const stale = queuedEvent({
      id: 9,
      eventUuid: "stale",
      attempts: MAX_SYNC_ATTEMPTS
    });
    const fresh = queuedEvent({ id: 10, eventUuid: "fresh", attempts: 0 });

    await syncPreparedQueuedEvents(
      [
        { event: stale, payload: batchPayload("stale", "APP_FOCUS") },
        { event: fresh, payload: batchPayload("fresh", "APP_FOCUS") }
      ],
      {}
    );

    expect(markEventDelivered).toHaveBeenCalledWith(9);
    expect(markEventsDelivered).toHaveBeenCalledWith([10]);
  });
});

describe("tracking resilience — duplicate-safe uploads", () => {
  beforeEach(() => {
    ingestEventsBatch.mockReset();
  });

  it("batch payload builder preserves eventUuid for idempotent server ingest", async () => {
    const { buildBatchPayloadFromQueuedEvent } = await import("./batch-event-payload");
    const payload = buildBatchPayloadFromQueuedEvent(
      { type: "INPUT_ACTIVITY", occurredAt: "2026-06-02T10:00:00.000Z" },
      "uuid-abc",
      "INPUT_ACTIVITY"
    );
    expect(payload.eventUuid).toBe("uuid-abc");
    expect(payload.eventKind).toBe("INPUT_ACTIVITY");
  });

  it("uploadPreparedQueuedEvents sends stable eventUuid values", async () => {
    ingestEventsBatch.mockResolvedValue(undefined);
    await uploadPreparedQueuedEvents(
      [
        {
          event: queuedEvent({ eventUuid: "stable-uuid" }),
          payload: batchPayload("stable-uuid", "HEARTBEAT")
        }
      ],
      {}
    );
    expect(ingestEventsBatch.mock.calls[0]?.[0]?.[0]?.eventUuid).toBe("stable-uuid");
  });
});
