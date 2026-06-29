import { randomUUID } from "node:crypto";
import type { SessionLifecycleTrailingEvent, SessionStopInput, SessionStopReason } from "../api/client";
import { getClientIanaTimeZone } from "../config/client-timezone";
import type { SessionState } from "../db/index";
import { getDeviceUuid } from "../security/device-identity";
import { getWorkDateKey } from "../utils/work-date-key";

export type SessionStopTrailingEvent = SessionLifecycleTrailingEvent & {
  eventKind: "SESSION_STOP";
};

export function buildSessionStartTrailingEvent(
  startedAt: string,
  workDateKey: string
): SessionLifecycleTrailingEvent {
  return {
    eventUuid: randomUUID(),
    eventKind: "SESSION_START",
    occurredAtIso: startedAt,
    workDateKey,
    source: "DESKTOP_AGENT"
  };
}

export function buildSessionStopTrailingEvent(
  stoppedAt: string,
  workDateKey: string,
  metadata?: Record<string, unknown>
): SessionStopTrailingEvent {
  return {
    eventUuid: randomUUID(),
    eventKind: "SESSION_STOP",
    occurredAtIso: stoppedAt,
    workDateKey,
    source: "DESKTOP_AGENT",
    ...(metadata ? { metadata } : {})
  };
}

export type BuildSessionStopInputOptions = {
  stopReason?: SessionStopReason;
  inactivityWorkActivityPercent?: number;
};

export function buildSessionStopInput(
  state: SessionState,
  stoppedAt: string,
  options: BuildSessionStopInputOptions = {}
): SessionStopInput {
  const clientTimeZone = getClientIanaTimeZone();
  const startedAt = state.startedAt ?? undefined;
  const startedMs = startedAt ? Date.parse(startedAt) : Number.NaN;
  const stoppedMs = Date.parse(stoppedAt);
  const durationMs =
    startedAt && Number.isFinite(startedMs) && Number.isFinite(stoppedMs) && stoppedMs > startedMs
      ? stoppedMs - startedMs
      : undefined;
  const workDateKey = getWorkDateKey(new Date(stoppedAt));
  const stopReason = options.stopReason ?? "USER";
  const trailingMetadata =
    stopReason === "INACTIVITY_AUTO"
      ? {
          stopReason,
          workActivityPercent: options.inactivityWorkActivityPercent ?? null
        }
      : { stopReason };

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
    stopReason,
    trailingEvents: [buildSessionStopTrailingEvent(stoppedAt, workDateKey, trailingMetadata)]
  };
}
