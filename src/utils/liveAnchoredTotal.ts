/** Renderer-only live display tick (no main-process polling). */
export const UI_LIVE_TICK_MS = 1000;

/**
 * Extrapolate a total from the last IPC snapshot while the session is active.
 * `anchoredTotalMs` must come from getWorkSummary() at `anchorFetchedAtMs`.
 */
export function computeLiveAnchoredMs(
  anchoredTotalMs: number,
  anchorFetchedAtMs: number | null,
  trackLive: boolean,
  nowMs: number = Date.now()
): number {
  if (!trackLive || anchorFetchedAtMs == null || !Number.isFinite(anchorFetchedAtMs)) {
    return anchoredTotalMs;
  }
  return anchoredTotalMs + Math.max(0, nowMs - anchorFetchedAtMs);
}
