import type Database from "better-sqlite3";
import { logger } from "../config/logger";

/**
 * One-time migration id for the release that ships corrected local today totals
 * and multi-display screenshots. Runs once per machine on first launch after update.
 */
export const ONE_TIME_LOCAL_TRACKING_RESET_ID = "local-tracking-reset-1.1.8";

const APPLIED_KEY = `oneTimeMigration:${ONE_TIME_LOCAL_TRACKING_RESET_ID}`;

/** Clears local tracking cache; keeps login, project cache, and delivered sync history. */
export function resetLocalTrackingData(db: Database.Database): void {
  db.exec(`
    UPDATE active_session
    SET active = 0,
        sessionId = NULL,
        projectId = NULL,
        description = NULL,
        startedAt = NULL,
        updatedAt = datetime('now')
    WHERE id = 1;

    DELETE FROM queued_events WHERE status IN ('pending', 'retry');

    DELETE FROM app_settings
    WHERE key = 'workLogEntries'
       OR key = 'activeSessionProjectName'
       OR key = 'activeSessionIsNonChargeable'
       OR key = 'activeSessionOwnerUserKey'
       OR key LIKE 'recentWorkTasks:%';
  `);
}

export function hasOneTimeLocalTrackingResetApplied(db: Database.Database): boolean {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = @key").get({
    key: APPLIED_KEY
  }) as { value: string } | undefined;
  return row?.value === "true";
}

/** Returns true when the one-time reset ran on this launch. */
export function runOneTimeLocalTrackingResetIfNeeded(db: Database.Database): boolean {
  if (hasOneTimeLocalTrackingResetApplied(db)) {
    return false;
  }

  resetLocalTrackingData(db);

  const updatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO app_settings (key, value, updatedAt)
     VALUES (@key, 'true', @updatedAt)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updatedAt = excluded.updatedAt`
  ).run({ key: APPLIED_KEY, updatedAt });

  logger.info("one-time-local-tracking-reset-applied", {
    migrationId: ONE_TIME_LOCAL_TRACKING_RESET_ID
  });

  return true;
}
