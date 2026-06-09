/** Minimum cursor travel (px) between polls to count as intentional mouse use. */
export const MOUSE_MOVE_THRESHOLD_PX = 12;

/** Poll interval used by InputActivitySampler (must match). */
export const MOUSE_POLL_INTERVAL_MS = 1_000;

export type MouseActivityPollStats = {
  pollCount: number;
  pollsWithSignificantMovement: number;
};

export type MouseActivityPercentResult = {
  mouseMovePercent: number;
  mouseMoveSamples: number;
  totalSamples: number;
  /** Estimated seconds with real mouse use in this sample window. */
  mouseActiveSeconds: number;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 100) {
    return 100;
  }
  return Number(value.toFixed(2));
}

/**
 * Mouse % = share of sample window seconds where the cursor actually moved.
 * Uses all poll ticks in the window (not keyboard-only "engaged" ticks), so idle
 * stretches pull the day average down toward real usage.
 */
export function computeMouseMovePercent(
  stats: MouseActivityPollStats,
  windowMs: number,
  pollIntervalMs = MOUSE_POLL_INTERVAL_MS
): MouseActivityPercentResult {
  const totalSamples = Math.max(1, stats.pollCount);
  const mouseMoveSamples = Math.min(totalSamples, Math.max(0, stats.pollsWithSignificantMovement));
  const windowSeconds = Math.max(0.001, windowMs / 1000);
  const pollSeconds = Math.max(0.001, pollIntervalMs / 1000);

  const mouseActiveSeconds = Number(
    Math.min(windowSeconds, mouseMoveSamples * pollSeconds).toFixed(3)
  );

  const mouseMovePercent = clampPercent((mouseActiveSeconds / windowSeconds) * 100);

  return {
    mouseMovePercent,
    mouseMoveSamples,
    totalSamples,
    mouseActiveSeconds
  };
}

export function cursorTravelPx(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number {
  const dx = toX - fromX;
  const dy = toY - fromY;
  return Math.hypot(dx, dy);
}

export function isSignificantMouseMove(travelPx: number): boolean {
  return travelPx >= MOUSE_MOVE_THRESHOLD_PX;
}

/** True when this poll had deliberate mouse use (movement or wheel, not click-only). */
export function isMouseActivePoll(travelPx: number, scrollCount: number): boolean {
  if (isSignificantMouseMove(travelPx)) {
    return true;
  }
  return scrollCount > 0;
}
