import type { TrackingBatchEventInput } from "../api/client";

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

export function buildBatchPayloadFromQueuedEvent(
  payload: Record<string, unknown>,
  eventUuid: string,
  eventKind: string
): TrackingBatchEventInput {
  const normalized = normalizeQueuedBatchPayload(payload, eventKind);
  return {
    ...(normalized as TrackingBatchEventInput),
    eventUuid,
    eventKind,
    type: (normalized.type as string | undefined) ?? eventKind
  };
}
