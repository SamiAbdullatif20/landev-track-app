/**
 * Clears local desktop tracking data for LANDEV Tracker v2.
 *
 * Usage:
 *   npm run reset:tracking          # full local reset
 *   npm run reset:tracking:today    # today only (work log + app usage)
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

const dbFileNames = ["landev-tracker-v2.sqlite", "tracker.sqlite"];

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

function sqliteQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function hasSqlite3() {
  try {
    execFileSync("sqlite3", ["-version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function runSql(dbPath, sql) {
  execFileSync("sqlite3", [dbPath, sql], { stdio: "pipe" });
}

function tableExists(dbPath, table) {
  try {
    const out = execFileSync(
      "sqlite3",
      [dbPath, `SELECT name FROM sqlite_master WHERE type='table' AND name=${sqliteQuote(table)};`],
      { encoding: "utf8" }
    ).trim();
    return out === table;
  } catch {
    return false;
  }
}

function clearLocalSessionV2(dbPath) {
  if (!tableExists(dbPath, "local_session")) return;
  runSql(
    dbPath,
    `
UPDATE local_session
SET active = 0,
    sessionId = NULL,
    projectId = NULL,
    projectName = NULL,
    description = '',
    startedAt = NULL,
    updatedAt = datetime('now')
WHERE id = 1;
`
  );
}

function resetTodayV2(dbPath) {
  const today = workDateKey();
  clearLocalSessionV2(dbPath);

  let removedWork = 0;
  if (tableExists(dbPath, "work_log")) {
    const before = Number(
      execFileSync(
        "sqlite3",
        [dbPath, `SELECT COUNT(*) FROM work_log WHERE workDateKey = ${sqliteQuote(today)};`],
        { encoding: "utf8" }
      ).trim() || "0"
    );
    runSql(dbPath, `DELETE FROM work_log WHERE workDateKey = ${sqliteQuote(today)};`);
    removedWork = before;
  }

  if (tableExists(dbPath, "app_usage_day")) {
    runSql(dbPath, `DELETE FROM app_usage_day WHERE workDateKey = ${sqliteQuote(today)};`);
  }
  if (tableExists(dbPath, "event_queue")) {
    runSql(dbPath, `DELETE FROM event_queue WHERE status = 'pending';`);
  }
  if (tableExists(dbPath, "screenshot_queue")) {
    runSql(dbPath, `DELETE FROM screenshot_queue WHERE status = 'pending';`);
  }

  return { today, removedWork };
}

function resetAllV2(dbPath) {
  clearLocalSessionV2(dbPath);
  if (tableExists(dbPath, "work_log")) runSql(dbPath, "DELETE FROM work_log;");
  if (tableExists(dbPath, "app_usage_day")) runSql(dbPath, "DELETE FROM app_usage_day;");
  if (tableExists(dbPath, "recent_projects")) runSql(dbPath, "DELETE FROM recent_projects;");
  if (tableExists(dbPath, "event_queue")) runSql(dbPath, "DELETE FROM event_queue;");
  if (tableExists(dbPath, "screenshot_queue")) runSql(dbPath, "DELETE FROM screenshot_queue;");
}

function clearLegacyActiveSession(dbPath) {
  if (!tableExists(dbPath, "active_session")) return;
  runSql(
    dbPath,
    `
UPDATE active_session
SET active = 0,
    sessionId = NULL,
    projectId = NULL,
    description = NULL,
    startedAt = NULL,
    updatedAt = datetime('now')
WHERE id = 1;
`
  );
}

function resetLegacy(dbPath) {
  clearLegacyActiveSession(dbPath);
  if (tableExists(dbPath, "queued_events")) {
    runSql(dbPath, "DELETE FROM queued_events WHERE status IN ('pending', 'retry');");
  }
  if (tableExists(dbPath, "queued_screenshots")) {
    runSql(dbPath, "DELETE FROM queued_screenshots WHERE status IN ('pending', 'retry');");
  }
  if (tableExists(dbPath, "app_settings")) {
    runSql(
      dbPath,
      `
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
}

function deleteSqliteFiles(dbPath) {
  for (const suffix of ["", "-wal", "-shm"]) {
    const file = `${dbPath}${suffix}`;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`  Deleted ${file}`);
    }
  }
}

function clearScreenshotDirs(dir) {
  for (const name of ["screenshot-queue-v2", "screenshot-queue"]) {
    const screenshotQueueDir = path.join(dir, name);
    if (fs.existsSync(screenshotQueueDir)) {
      fs.rmSync(screenshotQueueDir, { recursive: true, force: true });
      console.log(`  Cleared screenshot queue: ${screenshotQueueDir}`);
    }
  }
}

function resetDb(dbPath) {
  if (!fs.existsSync(dbPath)) return null;

  const isV2 = path.basename(dbPath) === "landev-tracker-v2.sqlite";

  if (!hasSqlite3()) {
    // Fallback: delete DB files entirely when sqlite3 CLI is unavailable.
    deleteSqliteFiles(dbPath);
    return { deletedFile: true, v2: isV2 };
  }

  if (isV2) {
    if (todayOnly) {
      const stats = resetTodayV2(dbPath);
      console.log(`Reset tracking data in: ${dbPath}`);
      console.log(`  ${stats.today}: removed ${stats.removedWork} work-log row(s)`);
      return stats;
    }
    resetAllV2(dbPath);
    console.log(`Reset tracking data in: ${dbPath}`);
    return { full: true, v2: true };
  }

  // Legacy tracker.sqlite
  resetLegacy(dbPath);
  console.log(`Reset legacy tracking data in: ${dbPath}`);
  return { full: true, v2: false };
}

let resetCount = 0;
for (const dir of userDataDirs) {
  if (!fs.existsSync(dir)) continue;
  let touched = false;
  for (const name of dbFileNames) {
    const dbPath = path.join(dir, name);
    const result = resetDb(dbPath);
    if (result) {
      resetCount += 1;
      touched = true;
    }
  }
  if (touched) {
    clearScreenshotDirs(dir);
  }
}

if (resetCount === 0) {
  console.log(
    "No tracker database found. Start the app once, or check AppData\\Roaming\\landev-track-app"
  );
  process.exit(1);
}

const mode = todayOnly ? "today" : "full";
console.log(`Done. ${mode} reset on ${resetCount} database(s). Restart the app.`);
console.log("Note: this only clears LOCAL data on this machine. Server-side tracking is unchanged.");
