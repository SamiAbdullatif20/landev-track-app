import axios from "axios";
import * as api from "../api/client";
import { logger } from "../config/logger";
import {
  uploadScreenshotDirect,
  type ScreenshotUploadPayload
} from "./screenshot-direct-upload";

function isPayloadTooLargeError(error: unknown): boolean {
  if (error instanceof api.ApiError && error.statusCode === 413) {
    return true;
  }
  return axios.isAxiosError(error) && error.response?.status === 413;
}

function errorStatus(error: unknown): number | null {
  if (error instanceof api.ApiError) {
    return error.statusCode ?? null;
  }
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null;
  }
  return null;
}

/**
 * Sign → Supabase → commit when the server supports it; otherwise multipart ingest
 * through the existing Vercel endpoint so screenshots still land on the dashboard.
 */
export async function uploadScreenshot(
  payload: ScreenshotUploadPayload,
  options: api.AuthAwareRequestOptions
): Promise<{ uploadUuid: string; method: "direct" | "multipart" }> {
  try {
    const result = await uploadScreenshotDirect(payload, options);
    return { uploadUuid: result.uploadUuid, method: "direct" };
  } catch (directError) {
    if (isPayloadTooLargeError(directError)) {
      throw directError;
    }

    const uploadUuid =
      typeof payload.metadata?.uploadUuid === "string" && payload.metadata.uploadUuid.trim()
        ? payload.metadata.uploadUuid.trim()
        : undefined;

    logger.warn("screenshot-direct-failed-trying-multipart", {
      uploadUuid,
      status: errorStatus(directError),
      error: directError instanceof Error ? directError.message : "unknown"
    });

    await api.ingestScreenshot(payload, options);

    logger.info("screenshot-uploaded-multipart-fallback", {
      uploadUuid,
      bytes: payload.imageBytes.length
    });

    return { uploadUuid: uploadUuid ?? "unknown", method: "multipart" };
  }
}

export function isBackendAuthForbidden(error: unknown): boolean {
  return error instanceof api.ApiError && error.kind === "auth";
}
