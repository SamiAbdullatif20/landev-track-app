import * as api from "../api/client";
import {
  getPendingScreenshots,
  markScreenshotDelivered,
  markScreenshotForRetry,
  MAX_SCREENSHOT_UPLOAD_ATTEMPTS,
  quarantineScreenshot,
  type QueuedScreenshotRow
} from "../db/screenshot-queue";
import { logger } from "../config/logger";
import { isAuthenticated } from "./auth-session";
import { uploadScreenshot, isBackendAuthForbidden } from "./screenshot-upload";
import fs from "node:fs";

function rowToIngestInput(row: QueuedScreenshotRow): api.ScreenshotIngestInput | null {
  if (!fs.existsSync(row.filePath)) {
    return null;
  }
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
  } catch {
    metadata = {};
  }
  return {
    capturedAt: row.capturedAt,
    imageBytes: fs.readFileSync(row.filePath),
    mimeType: row.mimeType === "image/png" ? "image/png" : "image/jpeg",
    projectId: row.projectId,
    ...(row.sessionId ? { sessionId: row.sessionId } : {}),
    metadata: {
      ...metadata,
      uploadUuid: row.uploadUuid
    }
  };
}

export async function flushScreenshotQueue(
  options: api.AuthAwareRequestOptions,
  limit = 10
): Promise<{ uploaded: number; failed: number }> {
  if (!isAuthenticated()) {
    return { uploaded: 0, failed: 0 };
  }

  const pending = getPendingScreenshots(limit);
  if (pending.length === 0) {
    return { uploaded: 0, failed: 0 };
  }

  let uploaded = 0;
  let failed = 0;

  for (const row of pending) {
    if (row.attempts >= MAX_SCREENSHOT_UPLOAD_ATTEMPTS) {
      quarantineScreenshot(row.id, row.filePath, "max_attempts");
      failed += 1;
      continue;
    }

    const payload = rowToIngestInput(row);
    if (!payload) {
      quarantineScreenshot(row.id, row.filePath, "missing_file");
      failed += 1;
      continue;
    }

    try {
      await uploadScreenshot(payload, options);
      markScreenshotDelivered(row.id, row.filePath);
      uploaded += 1;
      logger.info("screenshot-queue-uploaded", {
        uploadUuid: row.uploadUuid,
        capturedAt: row.capturedAt
      });
    } catch (error) {
      failed += 1;
      if (isBackendAuthForbidden(error) && row.attempts + 1 >= 3) {
        quarantineScreenshot(row.id, row.filePath, "auth_forbidden");
        logger.warn("screenshot-queue-quarantined-auth", {
          uploadUuid: row.uploadUuid,
          attempts: row.attempts + 1,
          error: error instanceof Error ? error.message : "unknown"
        });
        continue;
      }
      const nextRetryAt = markScreenshotForRetry(row.id, row.attempts + 1);
      logger.warn("screenshot-queue-upload-failed", {
        uploadUuid: row.uploadUuid,
        attempts: row.attempts + 1,
        nextRetryAt,
        status: error instanceof api.ApiError ? error.statusCode : undefined,
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  if (uploaded > 0) {
    logger.info("screenshot-queue-flush-complete", { uploaded, failed });
  }

  return { uploaded, failed };
}
