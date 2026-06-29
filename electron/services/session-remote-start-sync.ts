import * as api from "../api/client";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { getSessionState, saveSessionState } from "../db/queue-repo";
import { logger } from "../config/logger";
import { hasUsableWorkSessionId } from "./session-event-fields";
import { closeOrphanRemoteSession } from "./session-start-reconcile";

/** Register a desktop session on the server when start was deferred (offline/conflict recovery). */
export async function syncPendingRemoteSessionStart(
  options: api.AuthAwareRequestOptions
): Promise<boolean> {
  const state = getSessionState();
  if (
    !state.active
    || !state.startedAt
    || !state.projectId
    || hasUsableWorkSessionId(state.sessionId)
  ) {
    return false;
  }

  try {
    await closeOrphanRemoteSession(options);
  } catch (error) {
    logger.warn("pending-remote-start-orphan-close-failed", { error });
  }

  try {
    const projectName = state.projectId;
    const result = await api.startSession(
      {
        projectId: state.projectId,
        description: state.description ?? "",
        clientTimeZone: getClientIanaTimeZone(),
        startTimeUtc: state.startedAt
      },
      options
    );
    let sessionId = result.sessionId;
    if (!hasUsableWorkSessionId(sessionId)) {
      sessionId = await api.fetchActiveWorkSessionId(options);
    }
    if (!hasUsableWorkSessionId(sessionId)) {
      return false;
    }

    saveSessionState({
      active: state.active,
      sessionId,
      projectId: state.projectId,
      description: state.description,
      startedAt: state.startedAt
    });
    logger.info("pending-remote-session-start-synced", { sessionId });
    return true;
  } catch (error) {
    logger.warn("pending-remote-session-start-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return false;
  }
}
