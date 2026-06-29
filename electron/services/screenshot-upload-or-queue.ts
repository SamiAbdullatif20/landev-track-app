import { randomUUID } from "node:crypto";
import axios from "axios";
import * as api from "../api/client";
import { enqueueScreenshot } from "../db/screenshot-queue";
import { logger } from "../config/logger";
import type { ScreenshotUploadInput } from "./screenshot-worker";

function isPayloadTooLargeError(error: unknown): boolean {
  if (error instanceof api.ApiError && error.statusCode === 413) {
    return true;
  }
  return axios.isAxiosError(error) && error.response?.status === 413;
}

/**
 * Live upload with stable uploadUuid for server idempotency.
 * On non-413 failures, persist JPEG locally for the sync worker to flush later.
 */
export async function uploadScreenshotOrEnqueue(
  payload: ScreenshotUploadInput,
  options: api.AuthAwareRequestOptions
): Promise<void> {
  const uploadUuid = randomUUID();
  const enriched: ScreenshotUploadInput = {
    ...payload,
    metadata: {
      ...payload.metadata,
      uploadUuid
    }
  };

  try {
    await api.ingestScreenshot(enriched, options);
  } catch (error) {
    if (isPayloadTooLargeError(error)) {
      throw error;
    }
    enqueueScreenshot({
      capturedAt: enriched.capturedAt,
      imageBytes: enriched.imageBytes,
      mimeType: enriched.mimeType,
      projectId: enriched.projectId,
      sessionId: enriched.sessionId,
      metadata: enriched.metadata,
      uploadUuid
    });
    logger.warn("screenshot-enqueued-offline", {
      uploadUuid,
      error: error instanceof Error ? error.message : "unknown"
    });
  }
}
