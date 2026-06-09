import { getClientIanaTimeZone } from "../config/client-timezone";
import { isCatalogProjectId } from "../config/role-project-catalog";
import type { SessionState } from "../db/index";
import { getWorkDateKey } from "../utils/work-date-key";

/** Reject timestamp-style local-only ids from older desktop builds. */
export function hasUsableWorkSessionId(sessionId: string | null | undefined): boolean {
  if (!sessionId) {
    return false;
  }
  const trimmed = sessionId.trim();
  if (!trimmed) {
    return false;
  }
  return !/^\d{13,}$/.test(trimmed);
}

/** Fields every tracking event should carry so the web can link across stop/start cycles. */
export function buildWorkSessionEventFields(
  state: SessionState,
  at: Date = new Date()
): Record<string, unknown> {
  const workDateKey = getWorkDateKey(at);
  const workSessionId = hasUsableWorkSessionId(state.sessionId) ? state.sessionId!.trim() : null;
  const projectId =
    state.projectId && !isCatalogProjectId(state.projectId) ? state.projectId : null;

  return {
    workDateKey,
    ...(workSessionId ? { workSessionId, sessionId: workSessionId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(state.startedAt ? { sessionSegmentStartedAt: state.startedAt } : {}),
    clientTimeZone: getClientIanaTimeZone()
  };
}
