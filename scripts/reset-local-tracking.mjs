/**
 * Clears local desktop tracking data (today totals, work log, active session, queue).
 * Usage: npm run reset:tracking
 * Close the LANDEV Tracker app before running.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SQL = `
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
   OR key = 'currentAppUserKey'
   OR key = 'activeSessionOwnerUserKey'
   OR key LIKE 'recentWorkTasks:%';
`;

const userDataDirs = [
  path.join(os.homedir(), "AppData", "Roaming", "landev-track-app"),
  path.join(os.homedir(), "AppData", "Roaming", "LANDEV Tracker")
];

function resetDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  execFileSync("sqlite3", [dbPath, SQL], { stdio: "pipe" });
  console.log(`Reset tracking data in: ${dbPath}`);
  return true;
}

let resetCount = 0;
for (const dir of userDataDirs) {
  const dbPath = path.join(dir, "tracker.sqlite");
  if (resetDb(dbPath)) {
    resetCount += 1;
  }
}

if (resetCount === 0) {
  console.log("No tracker.sqlite found. Start the app once, or check AppData\\Roaming\\landev-track-app");
  process.exit(1);
}

console.log(`Done. Reset ${resetCount} database(s). Restart the app for a clean test.`);
