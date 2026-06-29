/**
 * Clears local desktop tracking data.
 *
 * Usage:
 *   npm run reset:tracking          # full local reset (all days, all accounts)
 *   npm run reset:tracking:today    # today only, all accounts on this machine
 *
 * Close the LANDEV Tracker app before running.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const todayOnly = process.argv.includes("--today");

const userDataDirs = [
  path.join(os.homedir(), "AppData", "Roaming", "landev-track-app"),
  path.join(os.homedir(), "AppData", "Roaming", "LANDEV Tracker")
];

function clientTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone?.trim() || "UTC";
  } catch {
    return "UTC";
  }
}

function workDateKey(atMs = Date.now(), timeZone = clientTimeZone()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(atMs));
}

function entryOverlapsWorkDate(entry, workDate, timeZone) {
  const startedMs = Date.parse(entry.startedAt);
  const stoppedMs = Date.parse(entry.stoppedAt);
  if (!Number.isFinite(startedMs) || !Number.isFinite(stoppedMs)) {
    return false;
  }
  const startKey = workDateKey(startedMs, timeZone);
  const stopKey = workDateKey(stoppedMs, timeZone);
  return startKey <= workDate && workDate <= stopKey;
}

function sqliteQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSql(dbPath, sql) {
  execFileSync("sqlite3", [dbPath, sql], { stdio: "pipe" });
}

function querySql(dbPath, sql) {
  return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf8" }).trim();
}

function stopActiveSessionSql() {
  return `
UPDATE active_session
SET active = 0,
    sessionId = NULL,
    projectId = NULL,
    description = NULL,
    startedAt = NULL,
    updatedAt = datetime('now')
WHERE id = 1;
`;
}

function writeJsonSetting(dbPath, key, value) {
  const json = JSON.stringify(value);
  const updatedAt = new Date().toISOString();
  runSql(
    dbPath,
    `INSERT INTO app_settings (key, value, updatedAt)
     VALUES (${sqliteQuote(key)}, ${sqliteQuote(json)}, ${sqliteQuote(updatedAt)})
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updatedAt = excluded.updatedAt;`
  );
}

function resetToday(dbPath) {
  const timeZone = clientTimeZone();
  const today = workDateKey(Date.now(), timeZone);

  runSql(dbPath, stopActiveSessionSql());
  runSql(dbPath, "DELETE FROM queued_events WHERE status IN ('pending', 'retry');");
  runSql(dbPath, "DELETE FROM queued_screenshots WHERE status IN ('pending', 'retry');");
  runSql(dbPath, "DELETE FROM app_settings WHERE key = 'activeSessionProjectName';");
  runSql(dbPath, "DELETE FROM app_settings WHERE key = 'activeSessionIsNonChargeable';");

  let removed = 0;
  let kept = 0;
  const raw = querySql(dbPath, "SELECT value FROM app_settings WHERE key = 'workLogEntries';");
  if (raw) {
    try {
      const entries = JSON.parse(raw);
      if (Array.isArray(entries)) {
        const next = entries.filter((entry) => {
          if (!entry || typeof entry !== "object") {
            return false;
          }
          if (entryOverlapsWorkDate(entry, today, timeZone)) {
            removed += 1;
            return false;
          }
          return true;
        });
        kept = next.length;
        writeJsonSetting(dbPath, "workLogEntries", next);
      }
    } catch {
      // ignore malformed work log
    }
  }

  return { today, timeZone, removed, kept };
}

function resetAll(dbPath) {
  runSql(
    dbPath,
    `
${stopActiveSessionSql()}
DELETE FROM queued_events WHERE status IN ('pending', 'retry');
DELETE FROM queued_screenshots WHERE status IN ('pending', 'retry');
DELETE FROM app_settings
WHERE key = 'workLogEntries'
   OR key = 'activeSessionProjectName'
   OR key = 'activeSessionIsNonChargeable'
   OR key = 'currentAppUserKey'
   OR key = 'activeSessionOwnerUserKey'
   OR key LIKE 'recentWorkTasks:%';
`
  );
}

function resetDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  if (todayOnly) {
    const stats = resetToday(dbPath);
    console.log(`Reset tracking data in: ${dbPath}`);
    console.log(
      `  ${stats.today} (${stats.timeZone}): removed ${stats.removed} work-log entries, kept ${stats.kept}`
    );
    return stats;
  }

  resetAll(dbPath);
  console.log(`Reset tracking data in: ${dbPath}`);
  return { full: true };
}

let resetCount = 0;
let totalRemoved = 0;
for (const dir of userDataDirs) {
  const dbPath = path.join(dir, "tracker.sqlite");
  const result = resetDb(dbPath);
  if (result) {
    resetCount += 1;
    totalRemoved += result.removed ?? 0;
    const screenshotQueueDir = path.join(dir, "screenshot-queue");
    if (fs.existsSync(screenshotQueueDir)) {
      fs.rmSync(screenshotQueueDir, { recursive: true, force: true });
      console.log(`  Cleared screenshot queue: ${screenshotQueueDir}`);
    }
  }
}

if (resetCount === 0) {
  console.log("No tracker.sqlite found. Start the app once, or check AppData\\Roaming\\landev-track-app");
  process.exit(1);
}

const mode = todayOnly ? "today (all accounts on this PC)" : "full";
console.log(`Done. ${mode} reset on ${resetCount} database(s). Restart the app.`);
if (todayOnly && totalRemoved === 0) {
  console.log("No work-log entries matched today's date — local today totals were already empty.");
}
if (todayOnly) {
  console.log("Note: this only clears LOCAL data on this machine. Server-side tracking is unchanged.");
}
