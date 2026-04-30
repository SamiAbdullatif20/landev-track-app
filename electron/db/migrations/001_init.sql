CREATE TABLE IF NOT EXISTS queued_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  next_retry_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_queued_events_status_retry
  ON queued_events(status, next_retry_at);

CREATE TABLE IF NOT EXISTS session_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  active INTEGER NOT NULL,
  session_id TEXT,
  project_id TEXT,
  description TEXT,
  started_at TEXT,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO session_state (id, active, updated_at)
VALUES (1, 0, CURRENT_TIMESTAMP);
