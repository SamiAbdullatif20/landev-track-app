import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { getDb } from "./index";
import { logger } from "../config/logger";

export type QueuedScreenshotRow = {
  id: number;
  uploadUuid: string;
  filePath: string;
  capturedAt: string;
  projectId: string | null;
  sessionId: string | null;
  metadataJson: string;
  mimeType: string;
  createdAt: string;
  attempts: number;
  nextRunAt: string | null;
  status: "pending" | "retry" | "delivered";
};

export type ScreenshotQueueInput = {
  capturedAt: string;
  imageBytes: Buffer;
  mimeType: "image/jpeg" | "image/png";
  projectId: string | null;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  uploadUuid?: string;
};

const MAX_SCREENSHOT_QUEUE_FILES = 600;
export const MAX_SCREENSHOT_UPLOAD_ATTEMPTS = 12;

export function getScreenshotQueueDir(): string {
  return path.join(app.getPath("userData"), "screenshot-queue");
}

function ensureQueueDir(): string {
  const dir = getScreenshotQueueDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function pruneOldQueueRows(): void {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, filePath FROM queued_screenshots
       WHERE status IN ('pending', 'retry')
       ORDER BY id ASC`
    )
    .all() as Array<{ id: number; filePath: string }>;
  if (rows.length <= MAX_SCREENSHOT_QUEUE_FILES) {
    return;
  }
  const overflow = rows.length - MAX_SCREENSHOT_QUEUE_FILES;
  for (let index = 0; index < overflow; index += 1) {
    const row = rows[index]!;
    try {
      if (fs.existsSync(row.filePath)) {
        fs.rmSync(row.filePath, { force: true });
      }
    } catch {
      // Best effort.
    }
    db.prepare("DELETE FROM queued_screenshots WHERE id = @id").run({ id: row.id });
    logger.warn("screenshot-queue-pruned-oldest", { id: row.id });
  }
}

export function enqueueScreenshot(input: ScreenshotQueueInput): string {
  const uploadUuid = input.uploadUuid ?? randomUUID();
  const dir = ensureQueueDir();
  const ext = input.mimeType === "image/jpeg" ? "jpg" : "png";
  const filePath = path.join(dir, `${uploadUuid}.${ext}`);
  fs.writeFileSync(filePath, input.imageBytes);

  const metadata = {
    ...(input.metadata ?? {}),
    uploadUuid
  };

  const db = getDb();
  db.prepare(
    `INSERT INTO queued_screenshots (
      uploadUuid, filePath, capturedAt, projectId, sessionId,
      metadataJson, mimeType, createdAt, attempts, nextRunAt, status
    ) VALUES (
      @uploadUuid, @filePath, @capturedAt, @projectId, @sessionId,
      @metadataJson, @mimeType, @createdAt, 0, NULL, 'pending'
    )`
  ).run({
    uploadUuid,
    filePath,
    capturedAt: input.capturedAt,
    projectId: input.projectId,
    sessionId: input.sessionId ?? null,
    metadataJson: JSON.stringify(metadata),
    mimeType: input.mimeType,
    createdAt: new Date().toISOString()
  });

  pruneOldQueueRows();
  logger.info("screenshot-enqueued-locally", {
    uploadUuid,
    capturedAt: input.capturedAt,
    bytes: input.imageBytes.length
  });
  return uploadUuid;
}

export function getPendingScreenshotCount(): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) AS total FROM queued_screenshots WHERE status IN ('pending', 'retry')"
    )
    .get() as { total: number };
  return row.total;
}

export function getPendingScreenshots(limit = 20): QueuedScreenshotRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM queued_screenshots
       WHERE status IN ('pending', 'retry')
         AND (nextRunAt IS NULL OR nextRunAt <= @now)
       ORDER BY id ASC
       LIMIT @limit`
    )
    .all({
      now: new Date().toISOString(),
      limit
    }) as QueuedScreenshotRow[];
}

export function markScreenshotDelivered(id: number, filePath: string): void {
  const db = getDb();
  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  } catch (error) {
    logger.warn("screenshot-queue-file-delete-failed", { filePath, error });
  }
  db.prepare(
    `UPDATE queued_screenshots SET status = 'delivered', nextRunAt = NULL WHERE id = @id`
  ).run({ id });
}

export function markScreenshotForRetry(id: number, attempts: number): string {
  const db = getDb();
  const retryMs = Math.min(5 * 60_000, 2 ** attempts * 1000);
  const nextRetry = new Date(Date.now() + retryMs).toISOString();
  db.prepare(
    `UPDATE queued_screenshots
     SET status = 'retry', attempts = @attempts, nextRunAt = @nextRetry
     WHERE id = @id`
  ).run({ id, attempts, nextRetry });
  return nextRetry;
}

export function quarantineScreenshot(id: number, filePath: string, reason: string): void {
  logger.error("screenshot-queue-quarantined", { id, reason });
  markScreenshotDelivered(id, filePath);
}
