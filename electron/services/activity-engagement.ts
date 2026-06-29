import {
  MOUSE_MOVE_THRESHOLD_PX,
  MOUSE_POLL_INTERVAL_MS
} from "./mouse-activity-metrics";

/** Low-intensity cursor travel still counts as partial engagement (CAD, UI nav). */
export const MOUSE_MICRO_MOVE_THRESHOLD_PX = 4;

export const ENGAGEMENT_PERSISTENCE_MS = 45_000;

export const MICRO_MOVE_CREDIT_SECONDS = 0.5;

/** Minimum engaged share of window when persistence applies. */
export const PERSISTENCE_FLOOR_RATIO = 0.55;

/** System must be at least this active (non-idle) for persistence carry. */
export const PERSISTENCE_MIN_ACTIVE_RATIO = 0.5;

/** Windows below this engaged share do not count as actual work time. */
export const MIN_ENGAGEMENT_RATIO = 0.05;

export type EngagementPollStats = {
  pollCount: number;
  pollsWithFullEngagement: number;
  pollsWithMicroOnly: number;
  pollsWithKeyboardHeld: number;
};

export type EngagedSecondsResult = {
  validEngagedSeconds: number;
  fullEngagementPolls: number;
  microEngagementPolls: number;
  keyboardPolls: number;
};

let lastEngagementAtMs: number | null = null;

export function isFullMouseEngagementPoll(
  travelPx: number,
  scrollCount: number,
  clickCount: number
): boolean {
  if (clickCount > 0 || scrollCount > 0) {
    return true;
  }
  return travelPx >= MOUSE_MOVE_THRESHOLD_PX;
}

export function isMicroMouseEngagementPoll(travelPx: number): boolean {
  return travelPx >= MOUSE_MICRO_MOVE_THRESHOLD_PX && travelPx < MOUSE_MOVE_THRESHOLD_PX;
}

export function isKeyboardEngagementPoll(keysDownCount: number): boolean {
  return keysDownCount > 0;
}

export function isPollEngaged(input: {
  travelPx: number;
  scrollCount: number;
  clickCount: number;
  keysDownCount: number;
}): boolean {
  return (
    isKeyboardEngagementPoll(input.keysDownCount)
    || isFullMouseEngagementPoll(input.travelPx, input.scrollCount, input.clickCount)
    || isMicroMouseEngagementPoll(input.travelPx)
  );
}

export function computeEngagedSecondsFromPolls(
  stats: EngagementPollStats,
  windowMs: number,
  pollIntervalMs = MOUSE_POLL_INTERVAL_MS
): EngagedSecondsResult {
  const windowSeconds = Math.max(0.001, windowMs / 1000);
  const pollSeconds = Math.max(0.001, pollIntervalMs / 1000);
  const fullEngagementPolls = Math.min(
    Math.max(1, stats.pollCount),
    Math.max(0, stats.pollsWithFullEngagement)
  );
  const microEngagementPolls = Math.min(
    Math.max(0, stats.pollsWithMicroOnly),
    Math.max(0, stats.pollCount - fullEngagementPolls)
  );
  const keyboardPolls = Math.min(Math.max(1, stats.pollCount), Math.max(0, stats.pollsWithKeyboardHeld));

  const fromFull = fullEngagementPolls * pollSeconds;
  const fromMicro = microEngagementPolls * MICRO_MOVE_CREDIT_SECONDS;
  const validEngagedSeconds = Number(
    Math.min(windowSeconds, fromFull + fromMicro).toFixed(3)
  );

  return {
    validEngagedSeconds,
    fullEngagementPolls,
    microEngagementPolls,
    keyboardPolls
  };
}

export function applyEngagementPersistence(
  validEngagedSeconds: number,
  windowSeconds: number,
  activeSeconds: number,
  nowMs: number
): number {
  const unionSeconds = Math.max(0, validEngagedSeconds);
  const activeRatio = windowSeconds > 0 ? activeSeconds / windowSeconds : 0;

  if (unionSeconds > 0) {
    lastEngagementAtMs = nowMs;
    return unionSeconds;
  }

  if (
    lastEngagementAtMs !== null
    && nowMs - lastEngagementAtMs <= ENGAGEMENT_PERSISTENCE_MS
    && activeRatio >= PERSISTENCE_MIN_ACTIVE_RATIO
  ) {
    const floorSeconds = Number((windowSeconds * PERSISTENCE_FLOOR_RATIO).toFixed(3));
    return Math.min(windowSeconds, floorSeconds);
  }

  return unionSeconds;
}

export function applyMinimumEngagementThreshold(
  validEngagedSeconds: number,
  windowSeconds: number
): number {
  if (windowSeconds <= 0 || validEngagedSeconds <= 0) {
    return 0;
  }
  if (validEngagedSeconds / windowSeconds <= MIN_ENGAGEMENT_RATIO) {
    return 0;
  }
  return validEngagedSeconds;
}

export function adjustEngagedSecondsForAntiCheat(
  validEngagedSeconds: number,
  flags: string[],
  windowSeconds: number
): number {
  if (flags.includes("repetitive_clicking")) {
    return 0;
  }
  if (flags.includes("artificial_mouse_movement")) {
    return Math.max(0, Number((validEngagedSeconds * 0.2).toFixed(3)));
  }
  return Math.min(windowSeconds, Math.max(0, validEngagedSeconds));
}

export function clearEngagementPersistenceState(): void {
  lastEngagementAtMs = null;
}

/** Test helper */
export function setLastEngagementAtMsForTests(value: number | null): void {
  lastEngagementAtMs = value;
}
