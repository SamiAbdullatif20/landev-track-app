/**
 * Agent transition events (APP_CHANGE, IDLE_*, etc.) are logged locally only until
 * the web API accepts them — queuing them was blocking/breaking batch sync and
 * starving INPUT_ACTIVITY / APP_FOCUS uploads.
 */
export const QUEUE_AGENT_EVENTS_FOR_SYNC = false;

/** Kinds that carry keyboard/mouse/click activity metrics in batch sync. */
export const INPUT_ACTIVITY_BATCH_KINDS = [
  "INPUT_ACTIVITY",
  "HEARTBEAT",
  "ACTIVITY_INTERVAL"
] as const;

/**
 * When false, input activity is still sampled locally (screenshot mouse rollup, probes)
 * but INPUT_ACTIVITY / HEARTBEAT / ACTIVITY_INTERVAL are not queued or uploaded.
 */
export const QUEUE_INPUT_ACTIVITY_FOR_SYNC = false;

export function isInputActivityBatchKind(kind: string): boolean {
  return (INPUT_ACTIVITY_BATCH_KINDS as readonly string[]).includes(kind);
}

export function batchEventKindsForSync(kinds: readonly string[]): string[] {
  if (QUEUE_INPUT_ACTIVITY_FOR_SYNC) {
    return [...kinds];
  }
  return kinds.filter((kind) => !isInputActivityBatchKind(kind));
}
