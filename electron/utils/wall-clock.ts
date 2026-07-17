/** Local calendar YYYY-MM-DD for a Date in the machine timezone. */
export function localWorkDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Wall-clock elapsed ms between two instants (never negative). */
export function wallElapsedMs(startedAtMs: number, endedAtMs: number): number {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) return 0;
  return Math.max(0, Math.round(endedAtMs - startedAtMs));
}

/**
 * Elapsed ms of an active session that counts toward "today"
 * (clamped to local midnight if the session started on a previous day).
 */
export function liveTodayElapsedMs(startedAt: string | null, nowMs = Date.now()): number {
  if (!startedAt) return 0;
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start)) return 0;
  const dayStart = new Date(nowMs);
  dayStart.setHours(0, 0, 0, 0);
  return wallElapsedMs(Math.max(start, dayStart.getTime()), nowMs);
}

/**
 * Split a session across local calendar days (DST-safe via setDate).
 * Used so "worked today" never gets yesterday's overnight hours.
 */
export function splitDurationByLocalDays(
  startedAtMs: number,
  stoppedAtMs: number
): Array<{ workDateKey: string; durationMs: number; sliceStartedAt: string; sliceStoppedAt: string }> {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(stoppedAtMs) || stoppedAtMs <= startedAtMs) {
    return [];
  }
  const portions: Array<{
    workDateKey: string;
    durationMs: number;
    sliceStartedAt: string;
    sliceStoppedAt: string;
  }> = [];
  let cursor = startedAtMs;
  while (cursor < stoppedAtMs) {
    const dayStart = new Date(cursor);
    dayStart.setHours(0, 0, 0, 0);
    const nextMidnight = new Date(dayStart);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    const sliceEnd = Math.min(stoppedAtMs, nextMidnight.getTime());
    const durationMs = wallElapsedMs(cursor, sliceEnd);
    if (durationMs > 0) {
      portions.push({
        workDateKey: localWorkDateKey(new Date(cursor)),
        durationMs,
        sliceStartedAt: new Date(cursor).toISOString(),
        sliceStoppedAt: new Date(sliceEnd).toISOString()
      });
    }
    cursor = sliceEnd;
  }
  return portions;
}
