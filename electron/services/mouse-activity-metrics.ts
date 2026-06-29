/** Minimum cursor travel (px) between polls to count as intentional mouse use. */
export const MOUSE_MOVE_THRESHOLD_PX = 12;

/** Poll interval used by InputActivitySampler (must match INPUT_ACTIVITY_POLL_MS). */
export const MOUSE_POLL_INTERVAL_MS = 2_000;

export type MouseActivityPollStats = {
  pollCount: number;
  pollsWithSignificantMovement: number;
};

export type ClickActivityPollStats = {
  pollCount: number;
  pollsWithClicks: number;
};

export type MouseActivityPercentResult = {
  mouseMovePercent: number;
  mouseMoveSamples: number;
  totalSamples: number;
  /** Estimated seconds with real mouse use in this sample window. */
  mouseActiveSeconds: number;
};

export type ClickActivityPercentResult = {
  clickActivityPercent: number;
  clickSamples: number;
  totalSamples: number;
  /** Estimated seconds with at least one click in this sample window. */
  clickActiveSeconds: number;
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

/**
 * Click % = share of sample window seconds where at least one click occurred.
 * Independent of movement % so all three breakdown metrics can coexist.
 */
export function computeClickActivityPercent(
  stats: ClickActivityPollStats,
  windowMs: number,
  pollIntervalMs = MOUSE_POLL_INTERVAL_MS
): ClickActivityPercentResult {
  const totalSamples = Math.max(1, stats.pollCount);
  const clickSamples = Math.min(totalSamples, Math.max(0, stats.pollsWithClicks));
  const windowSeconds = Math.max(0.001, windowMs / 1000);
  const pollSeconds = Math.max(0.001, pollIntervalMs / 1000);

  const clickActiveSeconds = Number(
    Math.min(windowSeconds, clickSamples * pollSeconds).toFixed(3)
  );

  const clickActivityPercent = clampPercent((clickActiveSeconds / windowSeconds) * 100);

  return {
    clickActivityPercent,
    clickSamples,
    totalSamples,
    clickActiveSeconds
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

/** True when this poll had at least one mouse button down. */
export function isClickActivePoll(clickCount: number): boolean {
  return clickCount > 0;
}

/** True when this poll had deliberate mouse use (movement or wheel, not click-only). */
export function isMouseActivePoll(travelPx: number, scrollCount: number): boolean {
  if (isSignificantMouseMove(travelPx)) {
    return true;
  }
  return scrollCount > 0;
}
