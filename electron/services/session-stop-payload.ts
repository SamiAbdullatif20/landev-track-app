import { randomUUID } from "node:crypto";
import type { SessionStopInput } from "../api/client";
import { getClientIanaTimeZone } from "../config/client-timezone";
import type { SessionState } from "../db/index";
import { getDeviceUuid } from "../security/device-identity";
import { getWorkDateKey } from "../utils/work-date-key";

export type SessionStopTrailingEvent = {
  eventUuid: string;
  eventKind: "SESSION_STOP";
  occurredAtIso: string;
  workDateKey: string;
  source: "DESKTOP_AGENT";
};

export function buildSessionStopTrailingEvent(
  stoppedAt: string,
  workDateKey: string
): SessionStopTrailingEvent {
  return {
    eventUuid: randomUUID(),
    eventKind: "SESSION_STOP",
    occurredAtIso: stoppedAt,
    workDateKey,
    source: "DESKTOP_AGENT"
  };
}

export function buildSessionStopInput(state: SessionState, stoppedAt: string): SessionStopInput {
  const clientTimeZone = getClientIanaTimeZone();
  const startedAt = state.startedAt ?? undefined;
  const startedMs = startedAt ? Date.parse(startedAt) : Number.NaN;
  const stoppedMs = Date.parse(stoppedAt);
  const durationMs =
    startedAt && Number.isFinite(startedMs) && Number.isFinite(stoppedMs) && stoppedMs > startedMs
      ? stoppedMs - startedMs
      : undefined;
  const workDateKey = getWorkDateKey(new Date(stoppedAt));

  return {
    sessionId: state.sessionId,
    stoppedAt,
    startedAt,
    sessionSegmentStartedAt: startedAt,
    durationMs,
    workDateKey,
    projectId: state.projectId,
    clientTimeZone,
    timezone: clientTimeZone,
    deviceUuid: getDeviceUuid(),
    trailingEvents: [buildSessionStopTrailingEvent(stoppedAt, workDateKey)]
  };
}
