import Database from "better-sqlite3";
import { app } from "electron";

let db: Database.Database;

export type QueuedEvent = {
  id: number;
  eventUuid: string;
  eventKind: string;
  payloadJson: string;
  createdAt: string;
  attempts: number;
  nextRunAt: string | null;
  status: "pending" | "retry" | "delivered";
};

export type SessionState = {
  id: number;
  active: number;
  sessionId: string | null;
  projectId: string | null;
  description: string | null;
  startedAt: string | null;
  updatedAt: string;
};

function runMigration(database: Database.Database): void {
  const queuedColumns = database
    .prepare("PRAGMA table_info(queued_events)")
    .all() as Array<{ name: string }>;
  const hasLegacyQueuedColumns = queuedColumns.some((column) => column.name === "event_id");

  if (hasLegacyQueuedColumns) {
    database.exec(`
      ALTER TABLE queued_events RENAME TO queued_events_legacy;
    `);
  }

  const sessionColumns = database
    .prepare("PRAGMA table_info(session_state)")
    .all() as Array<{ name: string }>;
  const hasLegacySessionTable = sessionColumns.length > 0;

  if (hasLegacySessionTable) {
    database.exec(`
      ALTER TABLE session_state RENAME TO active_session_legacy;
    `);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS queued_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventUuid TEXT NOT NULL UNIQUE,
      eventKind TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      nextRunAt TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE INDEX IF NOT EXISTS idx_queued_events_status_next_run
      ON queued_events(status, nextRunAt);

    CREATE TABLE IF NOT EXISTS active_session (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      active INTEGER NOT NULL,
      sessionId TEXT,
      projectId TEXT,
      description TEXT,
      startedAt TEXT,
      updatedAt TEXT NOT NULL
    );

    INSERT OR IGNORE INTO active_session (id, active, updatedAt)
    VALUES (1, 0, CURRENT_TIMESTAMP);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_cache (
      id TEXT PRIMARY KEY,
      displayLabel TEXT NOT NULL DEFAULT '',
      payloadJson TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_project_cache_display_label
      ON project_cache(displayLabel COLLATE NOCASE);
  `);

  const hasLegacyQueueTable = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'queued_events_legacy'")
    .get() as { name: string } | undefined;
  if (hasLegacyQueueTable) {
    database.exec(`
      INSERT OR IGNORE INTO queued_events (eventUuid, eventKind, payloadJson, createdAt, attempts, nextRunAt, status)
      SELECT event_id, event_type, payload_json, created_at, attempt_count, next_retry_at,
        CASE WHEN status = 'failed' THEN 'retry' ELSE 'pending' END
      FROM queued_events_legacy;
      DROP TABLE queued_events_legacy;
    `);
  }

  const hasLegacyActiveSession = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'active_session_legacy'")
    .get() as { name: string } | undefined;
  if (hasLegacyActiveSession) {
    database.exec(`
      INSERT OR REPLACE INTO active_session (id, active, sessionId, projectId, description, startedAt, updatedAt)
      SELECT id, active, session_id, project_id, description, started_at, updated_at
      FROM active_session_legacy
      WHERE id = 1;
      DROP TABLE active_session_legacy;
    `);
  }
}

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = `${app.getPath("userData")}\\tracker.sqlite`;
  db = new Database(dbPath);
  runMigration(db);
  return db;
}
