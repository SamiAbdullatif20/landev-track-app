import axios from "axios";
import {
  fetchRemoteSessionStatus,
  stopSession,
  type AuthAwareRequestOptions
} from "../api/client";
import { formatAxiosErrorBody } from "../api/error-message";
import { logger } from "../config/logger";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { getDeviceUuid } from "../security/device-identity";
import { getWorkDateKey } from "../utils/work-date-key";
import { buildSessionStopTrailingEvent } from "./session-stop-payload";

const SESSION_START_CONFLICT =
  /work session already started|already started with a different start time|active work session|session already (running|active|started)/i;

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

/**
 * Stop a server-side session that is still active while the desktop is paused.
 * Prevents "already started with a different start time today" on the next start.
 */
export async function closeOrphanRemoteSession(
  options: AuthAwareRequestOptions
): Promise<boolean> {
  const remote = await fetchRemoteSessionStatus(options);
  if (!remote.active || !remote.startedAt) {
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
