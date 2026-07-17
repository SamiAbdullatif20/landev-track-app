import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { localWorkDateKey, splitDurationByLocalDays } from "../utils/wall-clock";

let db: Database.Database | null = null;

export type LocalSessionRow = {
  active: number;
  sessionId: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string;
  startedAt: string | null;
  draftDescription: string;
};

export type QueuedScreenshotRow = {
  id: number;
  uploadUuid: string;
  capturedAt: string;
  filePath: string;
  mimeType: string;
  projectId: string | null;
  sessionId: string | null;
  metadataJson: string;
  attempts: number;
  status: string;
};

function dbPath(): string {
  return path.join(app.getPath("userData"), "landev-tracker-v2.sqlite");
}

export function getDb(): Database.Database {
  if (db) return db;
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active INTEGER NOT NULL DEFAULT 0,
      sessionId TEXT,
      projectId TEXT,
      projectName TEXT,
      description TEXT NOT NULL DEFAULT '',
      startedAt TEXT,
      draftDescription TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL
    );
    INSERT OR IGNORE INTO local_session (id, active, description, draftDescription, updatedAt)
    VALUES (1, 0, '', '', datetime('now'));

    CREATE TABLE IF NOT EXISTS screenshot_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uploadUuid TEXT NOT NULL UNIQUE,
      capturedAt TEXT NOT NULL,
      filePath TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      projectId TEXT,
      sessionId TEXT,
      metadataJson TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_projects (
      projectId TEXT PRIMARY KEY,
      projectName TEXT NOT NULL,
      lastWorkedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId TEXT NOT NULL,
      projectName TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      stoppedAt TEXT NOT NULL,
      durationMs INTEGER NOT NULL,
      workDateKey TEXT NOT NULL,
      sessionId TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_work_log_date ON work_log(workDateKey);

    CREATE TABLE IF NOT EXISTS app_usage_day (
      workDateKey TEXT NOT NULL,
      appKey TEXT NOT NULL,
      displayName TEXT NOT NULL,
      processName TEXT,
      seconds INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (workDateKey, appKey)
    );

    CREATE TABLE IF NOT EXISTS event_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventUuid TEXT NOT NULL UNIQUE,
      eventKind TEXT NOT NULL,
      payloadJson TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      nextRunAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_event_queue_pending ON event_queue(status, nextRunAt);
  `);

  // Older installs may lack sessionId — add it without rebuilding the table.
  const workLogCols = db.prepare(`PRAGMA table_info(work_log)`).all() as Array<{ name: string }>;
  if (!workLogCols.some((col) => col.name === "sessionId")) {
    db.exec(`ALTER TABLE work_log ADD COLUMN sessionId TEXT`);
  }
  try {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_work_log_session_day ON work_log(sessionId, workDateKey) WHERE sessionId IS NOT NULL`
    );
  } catch {
    // ignore if legacy duplicates block the unique index
  }

  return db;
}

export function readLocalSession(): LocalSessionRow {
  const row = getDb()
    .prepare(
      `SELECT active, sessionId, projectId, projectName, description, startedAt, draftDescription
       FROM local_session WHERE id = 1`
    )
    .get() as LocalSessionRow | undefined;
  return (
    row ?? {
      active: 0,
      sessionId: null,
      projectId: null,
      projectName: null,
      description: "",
      startedAt: null,
      draftDescription: ""
    }
  );
}

export function writeLocalSession(input: Partial<LocalSessionRow> & { active: number }): void {
  const current = readLocalSession();
  getDb()
    .prepare(
      `UPDATE local_session SET
        active = @active,
        sessionId = @sessionId,
        projectId = @projectId,
        projectName = @projectName,
        description = @description,
        startedAt = @startedAt,
        draftDescription = @draftDescription,
        updatedAt = @updatedAt
      WHERE id = 1`
    )
    .run({
      active: input.active,
      sessionId: input.sessionId ?? current.sessionId,
      projectId: input.projectId ?? current.projectId,
      projectName: input.projectName ?? current.projectName,
      description: input.description ?? current.description,
      startedAt: input.startedAt === undefined ? current.startedAt : input.startedAt,
      draftDescription: input.draftDescription ?? current.draftDescription,
      updatedAt: new Date().toISOString()
    });
}

export function clearLocalSession(): void {
  writeLocalSession({
    active: 0,
    sessionId: null,
    projectId: null,
    projectName: null,
    description: "",
    startedAt: null,
    draftDescription: readLocalSession().draftDescription
  });
}

export function enqueueScreenshot(row: {
  uploadUuid: string;
  capturedAt: string;
  filePath: string;
  mimeType: string;
  projectId: string | null;
  sessionId: string | null;
  metadataJson: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO screenshot_queue
        (uploadUuid, capturedAt, filePath, mimeType, projectId, sessionId, metadataJson, attempts, status, updatedAt)
       VALUES
        (@uploadUuid, @capturedAt, @filePath, @mimeType, @projectId, @sessionId, @metadataJson, 0, 'pending', @updatedAt)
       ON CONFLICT(uploadUuid) DO UPDATE SET
         filePath = excluded.filePath,
         status = 'pending',
         updatedAt = excluded.updatedAt`
    )
    .run({ ...row, updatedAt: new Date().toISOString() });
}

export function listPendingScreenshots(limit = 10): QueuedScreenshotRow[] {
  return getDb()
    .prepare(
      `SELECT id, uploadUuid, capturedAt, filePath, mimeType, projectId, sessionId, metadataJson, attempts, status
       FROM screenshot_queue
       WHERE status = 'pending'
       ORDER BY id ASC
       LIMIT ?`
    )
    .all(limit) as QueuedScreenshotRow[];
}

export function markScreenshotDelivered(id: number): void {
  getDb()
    .prepare(
      `UPDATE screenshot_queue SET status = 'delivered', updatedAt = @updatedAt WHERE id = @id`
    )
    .run({ id, updatedAt: new Date().toISOString() });
}

export function markScreenshotRetry(id: number, attempts: number): void {
  getDb()
    .prepare(
      `UPDATE screenshot_queue SET attempts = @attempts, status = 'pending', updatedAt = @updatedAt WHERE id = @id`
    )
    .run({ id, attempts, updatedAt: new Date().toISOString() });
}

export function screenshotQueueDir(): string {
  const dir = path.join(app.getPath("userData"), "screenshot-queue-v2");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RecentProjectRow = {
  projectId: string;
  projectName: string;
  lastWorkedAt: string;
};

function pruneRecentProjectsOlderThanOneDay(): void {
  const cutoff = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  getDb().prepare(`DELETE FROM recent_projects WHERE lastWorkedAt < ?`).run(cutoff);
}

export function touchRecentProject(projectId: string, projectName: string, atIso?: string): void {
  if (!projectId.trim()) return;
  const lastWorkedAt = atIso ?? new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO recent_projects (projectId, projectName, lastWorkedAt)
       VALUES (@projectId, @projectName, @lastWorkedAt)
       ON CONFLICT(projectId) DO UPDATE SET
         projectName = excluded.projectName,
         lastWorkedAt = excluded.lastWorkedAt`
    )
    .run({
      projectId,
      projectName: projectName.trim() || projectId,
      lastWorkedAt
    });
  pruneRecentProjectsOlderThanOneDay();
}

export function listRecentProjects(limit = 8): RecentProjectRow[] {
  pruneRecentProjectsOlderThanOneDay();
  const cutoff = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  return getDb()
    .prepare(
      `SELECT projectId, projectName, lastWorkedAt
       FROM recent_projects
       WHERE lastWorkedAt >= ?
       ORDER BY lastWorkedAt DESC
       LIMIT ?`
    )
    .all(cutoff, limit) as RecentProjectRow[];
}

export function recordWorkLogEntry(input: {
  projectId: string;
  projectName: string;
  startedAt: string;
  stoppedAt: string;
  durationMs: number;
  sessionId?: string | null;
}): void {
  const startedAtMs = Date.parse(input.startedAt);
  const stoppedAtMs = Date.parse(input.stoppedAt);
  const portions = splitDurationByLocalDays(startedAtMs, stoppedAtMs);
  // Fallback: if timestamps fail to parse, keep legacy single-row insert.
  const rows =
    portions.length > 0
      ? portions
      : [
          {
            workDateKey: localWorkDateKey(new Date(input.stoppedAt)),
            durationMs: Math.max(0, Math.round(input.durationMs)),
            sliceStartedAt: input.startedAt,
            sliceStoppedAt: input.stoppedAt
          }
        ];

  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO work_log (projectId, projectName, startedAt, stoppedAt, durationMs, workDateKey, sessionId)
     VALUES (@projectId, @projectName, @startedAt, @stoppedAt, @durationMs, @workDateKey, @sessionId)`
  );

  const sessionId = input.sessionId?.trim() || null;
  const dedupeKey = sessionId || `local:${input.startedAt}`;
  const existing = db
    .prepare(`SELECT 1 AS ok FROM work_log WHERE sessionId = ? LIMIT 1`)
    .get(dedupeKey) as { ok: number } | undefined;
  if (existing) return;

  const tx = db.transaction(() => {
    for (const row of rows) {
      if (row.durationMs <= 0) continue;
      insert.run({
        projectId: input.projectId,
        projectName: input.projectName,
        startedAt: row.sliceStartedAt,
        stoppedAt: row.sliceStoppedAt,
        durationMs: row.durationMs,
        workDateKey: row.workDateKey,
        sessionId: dedupeKey
      });
    }
  });
  tx();
}

/** Sum of completed session durations for the local calendar day. */
export function getTodayCompletedMs(now = new Date()): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(durationMs), 0) AS total
       FROM work_log
       WHERE workDateKey = ?`
    )
    .get(localWorkDateKey(now)) as { total: number } | undefined;
  return Number(row?.total ?? 0);
}

export { liveTodayElapsedMs, localWorkDateKey } from "../utils/wall-clock";

export function addAppUsageSeconds(input: {
  displayName: string;
  processName: string;
  application: string;
  seconds: number;
  workDateKey?: string;
}): void {
  if (input.seconds <= 0) return;
  const workDateKey = input.workDateKey ?? localWorkDateKey();
  const appKey = `${input.application}::${input.displayName}`.toLowerCase();
  getDb()
    .prepare(
      `INSERT INTO app_usage_day (workDateKey, appKey, displayName, processName, seconds, updatedAt)
       VALUES (@workDateKey, @appKey, @displayName, @processName, @seconds, @updatedAt)
       ON CONFLICT(workDateKey, appKey) DO UPDATE SET
         seconds = seconds + excluded.seconds,
         displayName = excluded.displayName,
         processName = excluded.processName,
         updatedAt = excluded.updatedAt`
    )
    .run({
      workDateKey,
      appKey,
      displayName: input.displayName,
      processName: input.processName,
      seconds: Math.round(input.seconds),
      updatedAt: new Date().toISOString()
    });
}

export type AppUsageRow = {
  displayName: string;
  processName: string | null;
  seconds: number;
};

export function listTodayAppUsage(limit = 20): AppUsageRow[] {
  return getDb()
    .prepare(
      `SELECT displayName, processName, seconds
       FROM app_usage_day
       WHERE workDateKey = ?
       ORDER BY seconds DESC
       LIMIT ?`
    )
    .all(localWorkDateKey(), limit) as AppUsageRow[];
}

export type QueuedEventRow = {
  id: number;
  eventUuid: string;
  eventKind: string;
  payloadJson: string;
  attempts: number;
};

export function enqueueTrackingEvent(input: {
  eventUuid: string;
  eventKind: string;
  payload: Record<string, unknown>;
}): void {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO event_queue (eventUuid, eventKind, payloadJson, attempts, status, nextRunAt, createdAt)
       VALUES (@eventUuid, @eventKind, @payloadJson, 0, 'pending', @now, @now)
       ON CONFLICT(eventUuid) DO NOTHING`
    )
    .run({
      eventUuid: input.eventUuid,
      eventKind: input.eventKind,
      payloadJson: JSON.stringify(input.payload),
      now
    });
}

export function listPendingEvents(limit = 40): QueuedEventRow[] {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `SELECT id, eventUuid, eventKind, payloadJson, attempts
       FROM event_queue
       WHERE status = 'pending' AND nextRunAt <= ?
       ORDER BY id ASC
       LIMIT ?`
    )
    .all(now, limit) as QueuedEventRow[];
}

export function markEventDelivered(id: number): void {
  getDb()
    .prepare(`UPDATE event_queue SET status = 'delivered', nextRunAt = @now WHERE id = @id`)
    .run({ id, now: new Date().toISOString() });
}

export function markEventRetry(id: number, attempts: number): void {
  const delayMs = Math.min(15 * 60_000, 1000 * 2 ** Math.min(attempts, 8));
  const nextRunAt = new Date(Date.now() + delayMs).toISOString();
  getDb()
    .prepare(
      `UPDATE event_queue SET attempts = @attempts, status = 'pending', nextRunAt = @nextRunAt WHERE id = @id`
    )
    .run({ id, attempts, nextRunAt });
}
