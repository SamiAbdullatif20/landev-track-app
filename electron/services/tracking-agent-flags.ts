/**
 * Agent transition events (APP_CHANGE, IDLE_*, etc.) are logged locally only until
 * the web API accepts them — queuing them was blocking/breaking batch sync and
 * starving INPUT_ACTIVITY / APP_FOCUS uploads.
 */
export const QUEUE_AGENT_EVENTS_FOR_SYNC = false;
