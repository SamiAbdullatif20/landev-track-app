import axios from "axios";
import {
  fetchActiveWorkSessionId,
  fetchRemoteSessionStatus,
  isWorkSessionAlreadyStoppedError,
  stopSession,
  type AuthAwareRequestOptions
} from "../api/client";
import { formatAxiosErrorBody } from "../api/error-message";
import { logger } from "../config/logger";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { getDeviceUuid } from "../security/device-identity";
import { getWorkDateKey } from "../utils/work-date-key";
import { hasUsableWorkSessionId } from "./session-event-fields";
import { buildSessionStopTrailingEvent } from "./session-stop-payload";
import { isOpenRemoteWorkSession } from "./session-remote-status";

const SESSION_START_CONFLICT =
  /work session already|already in progress|another project today|already started with a different start time|active work session|session already (running|active|started)/i;

const RECONCILE_RETRY_DELAY_MS = 400;
const RECONCILE_MAX_ATTEMPTS = 3;

export function isActiveSessionStartConflictError(error: unknown): boolean {
  if (error instanceof Error && SESSION_START_CONFLICT.test(error.message)) {
    return true;
  }
  if (axios.isAxiosError(error) && error.response) {
    const message =
      formatAxiosErrorBody(error.response.data, error.response.status) || error.message;
    return SESSION_START_CONFLICT.test(message);
  }
  return false;
}

function buildBlindStopPayload(stoppedAt: string) {
  const workDateKey = getWorkDateKey(new Date(stoppedAt));
  return {
    stoppedAt,
    workDateKey,
    clientTimeZone: getClientIanaTimeZone(),
    timezone: getClientIanaTimeZone(),
    deviceUuid: getDeviceUuid(),
    stopReason: "USER" as const,
    trailingEvents: [buildSessionStopTrailingEvent(stoppedAt, workDateKey)]
  };
}

/**
 * Close today's open work session when status/id lookup fails but start still conflicts.
 * Sends stop with workDateKey + timezone only (no sessionId).
 */
export async function blindStopOpenWorkSessionForToday(
  options: AuthAwareRequestOptions
): Promise<boolean> {
  const stoppedAt = new Date().toISOString();
  try {
    logger.info("tracking-blind-stop-today-work-session", {
      workDateKey: getWorkDateKey(new Date(stoppedAt)),
      stoppedAt
    });
    await stopSession(buildBlindStopPayload(stoppedAt), options);
    return true;
  } catch (error) {
    if (isWorkSessionAlreadyStoppedError(error)) {
      return true;
    }
    logger.warn("tracking-blind-stop-today-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return false;
  }
}

/**
 * Stop a server-side session that is still active while the desktop is paused.
 * Prevents "already started with a different start time today" on the next start.
 */
export async function closeOrphanRemoteSession(
  options: AuthAwareRequestOptions
): Promise<boolean> {
  const remote = await fetchRemoteSessionStatus(options);
  if (!isOpenRemoteWorkSession(remote) || !remote.startedAt) {
    return false;
  }

  const stoppedAt = new Date().toISOString();
  const workDateKey = getWorkDateKey(new Date(stoppedAt));
  const startedMs = Date.parse(remote.startedAt);
  const stoppedMs = Date.parse(stoppedAt);
  const durationMs =
    Number.isFinite(startedMs) && Number.isFinite(stoppedMs) && stoppedMs > startedMs
      ? stoppedMs - startedMs
      : undefined;

  logger.info("tracking-close-orphan-remote-session", {
    sessionId: remote.sessionId,
    startedAt: remote.startedAt,
    stoppedAt,
    projectId: remote.projectId
  });

  await stopSession(
    {
      sessionId: remote.sessionId,
      stoppedAt,
      startedAt: remote.startedAt,
      sessionSegmentStartedAt: remote.startedAt,
      durationMs,
      workDateKey,
      projectId: remote.projectId,
      clientTimeZone: getClientIanaTimeZone(),
      timezone: getClientIanaTimeZone(),
      deviceUuid: getDeviceUuid(),
      trailingEvents: [buildSessionStopTrailingEvent(stoppedAt, workDateKey)]
    },
    options
  );

  return true;
}

/**
 * Stop any server-side session blocking a new start — from status poll, id lookup, or blind stop.
 */
export async function resolveAndCloseStaleRemoteSession(
  options: AuthAwareRequestOptions
): Promise<boolean> {
  const closedFromStatus = await closeOrphanRemoteSession(options);
  if (closedFromStatus) {
    return true;
  }

  const sessionId = await fetchActiveWorkSessionId(options);
  if (hasUsableWorkSessionId(sessionId)) {
    const stoppedAt = new Date().toISOString();
    const workDateKey = getWorkDateKey(new Date(stoppedAt));

    logger.info("tracking-close-stale-remote-session-by-id", { sessionId, stoppedAt });

    await stopSession(
      {
        sessionId,
        stoppedAt,
        workDateKey,
        clientTimeZone: getClientIanaTimeZone(),
        timezone: getClientIanaTimeZone(),
        deviceUuid: getDeviceUuid(),
        trailingEvents: [buildSessionStopTrailingEvent(stoppedAt, workDateKey)]
      },
      options
    );

    return true;
  }

  return blindStopOpenWorkSessionForToday(options);
}

/** Aggressive teardown after a start conflict (e.g. post-update orphan on the server). */
export async function reconcileActiveSessionStartConflict(
  options: AuthAwareRequestOptions
): Promise<void> {
  for (let attempt = 0; attempt < RECONCILE_MAX_ATTEMPTS; attempt += 1) {
    await resolveAndCloseStaleRemoteSession(options);
    if (attempt < RECONCILE_MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, RECONCILE_RETRY_DELAY_MS));
    }
  }
}
