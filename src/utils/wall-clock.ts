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
