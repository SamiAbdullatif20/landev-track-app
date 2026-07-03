import type { TrackingBatchEventInput } from "../api/client";
import { getSessionState } from "../db/queue-repo";
import { buildWorkSessionEventFields, hasUsableWorkSessionId } from "./session-event-fields";

/** Drop subsamples that ended before the current session segment started. */
export function filterSubsamplesForSessionSegment<T extends { endedAtMs: number }>(
  samples: T[],
  segmentStartedAtMs: number | null | undefined
): T[] {
  if (segmentStartedAtMs == null || !Number.isFinite(segmentStartedAtMs)) {
    return samples;
  }
  return samples.filter((sample) => sample.endedAtMs >= segmentStartedAtMs);
}

/** Wall-clock interval start, clamped to the active session segment when stop/start splits a block. */
export function effectiveActivityIntervalStartMs(
  wallIntervalStartMs: number,
  segmentStartedAtMs: number | null | undefined
): number {
  if (segmentStartedAtMs == null || !Number.isFinite(segmentStartedAtMs)) {
    return wallIntervalStartMs;
  }
  return Math.max(wallIntervalStartMs, segmentStartedAtMs);
}

export function parseIsoMs(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Normalize queued payloads before upload so segment boundaries do not collide on the server. */
export function normalizeQueuedBatchPayload(
  payload: Record<string, unknown>,
  eventKind: string
): Record<string, unknown> {
  if (eventKind !== "ACTIVITY_INTERVAL") {
    return payload;
  }

  const segmentStartedAtMs = parseIsoMs(payload.sessionSegmentStartedAt);
  const intervalStartMs = parseIsoMs(payload.intervalStartAt);
  const intervalEndMs = parseIsoMs(payload.intervalEndAt);
  if (
    segmentStartedAtMs == null
    || intervalStartMs == null
    || intervalEndMs == null
    || segmentStartedAtMs <= intervalStartMs
    || segmentStartedAtMs >= intervalEndMs
  ) {
    return payload;
  }

  const intervalStartAt = new Date(segmentStartedAtMs).toISOString();
  const normalized: Record<string, unknown> = {
    ...payload,
    intervalStartAt
  };

  const metadata = payload.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    normalized.metadata = {
      ...(metadata as Record<string, unknown>),
      intervalStartAt
    };
  }

  return normalized;
}

function patchActiveSessionFields(payload: Record<string, unknown>): Record<string, unknown> {
  const state = getSessionState();
  if (!state.active) {
    return payload;
  }
  const sessionFields = buildWorkSessionEventFields(state);
  const workSessionId = sessionFields.workSessionId as string | undefined;
  if (!hasUsableWorkSessionId(workSessionId)) {
    return payload;
  }
  if (
    hasUsableWorkSessionId(payload.sessionId as string | undefined)
    || hasUsableWorkSessionId(payload.workSessionId as string | undefined)
  ) {
    return payload;
  }

  const metadata =
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? { ...(payload.metadata as Record<string, unknown>) }
      : {};

  return {
    ...payload,
    ...sessionFields,
    metadata: {
      ...metadata,
      ...sessionFields
    }
  };
}

export function buildBatchPayloadFromQueuedEvent(
  payload: Record<string, unknown>,
  eventUuid: string,
  eventKind: string
): TrackingBatchEventInput {
  const withSession = patchActiveSessionFields(payload);
  const normalized = normalizeQueuedBatchPayload(withSession, eventKind);
  return {
    ...(normalized as TrackingBatchEventInput),
    eventUuid,
    eventKind,
    type: (normalized.type as string | undefined) ?? eventKind
  };
}
