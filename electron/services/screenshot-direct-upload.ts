import axios from "axios";
import { randomUUID } from "node:crypto";
import * as api from "../api/client";
import { logger } from "../config/logger";

export type ScreenshotUploadPayload = api.ScreenshotIngestInput & {
  metadata?: Record<string, unknown> & { uploadUuid?: string };
};

type SignResult = api.ScreenshotSignResult;

const SIGN_MAX_ATTEMPTS = 4;
const SUPABASE_UPLOAD_MAX_ATTEMPTS = 3;
const COMMIT_MAX_ATTEMPTS = 4;

function resolveUploadUuid(payload: ScreenshotUploadPayload): string {
  const fromMetadata = payload.metadata?.uploadUuid;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  return randomUUID();
}

function buildSignInput(
  payload: ScreenshotUploadPayload,
  uploadUuid: string
): api.ScreenshotSignInput {
  return {
    capturedAtIso: payload.capturedAt,
    mimeType: payload.mimeType,
    uploadUuid,
    byteSize: payload.imageBytes.length,
    projectId: payload.projectId ?? undefined,
    sessionId: payload.sessionId
  };
}

function buildSignedUploadUrl(signedUrl: string, token: string): string {
  if (signedUrl.includes("token=")) {
    return signedUrl;
  }
  const separator = signedUrl.includes("?") ? "&" : "?";
  return `${signedUrl}${separator}token=${encodeURIComponent(token)}`;
}

function httpStatus(error: unknown): number | null {
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null;
  }
  if (error instanceof api.ApiError) {
    return error.statusCode ?? null;
  }
  return null;
}

function isTransientNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error) && !error.response) {
    return true;
  }
  const status = httpStatus(error);
  return status === 429 || (status != null && status >= 500);
}

function shouldResignForUploadError(error: unknown): boolean {
  const status = httpStatus(error);
  return status === 403 || isTransientNetworkError(error);
}

function delayMsForAttempt(attempt: number): number {
  return Math.min(60_000, 1000 * 2 ** attempt);
}

function safeUrlHost(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

const supabaseUploadConfig = {
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  timeout: 60_000
};

async function putSignedUrlAsIs(params: {
  sign: SignResult;
  imageBytes: Buffer;
  mimeType: string;
}): Promise<void> {
  await axios.put(params.sign.signedUrl, params.imageBytes, {
    ...supabaseUploadConfig,
    headers: {
      "Content-Type": params.mimeType,
      "x-upsert": "true",
      "cache-control": "3600"
    }
  });
}

async function putWithQueryToken(params: {
  sign: SignResult;
  imageBytes: Buffer;
  mimeType: string;
}): Promise<void> {
  const uploadUrl = buildSignedUploadUrl(params.sign.signedUrl, params.sign.token);
  await axios.put(uploadUrl, params.imageBytes, {
    ...supabaseUploadConfig,
    headers: {
      "Content-Type": params.mimeType,
      "x-upsert": "true"
    }
  });
}

async function putWithBearerToken(params: {
  sign: SignResult;
  imageBytes: Buffer;
  mimeType: string;
}): Promise<void> {
  await axios.put(params.sign.signedUrl, params.imageBytes, {
    ...supabaseUploadConfig,
    headers: {
      Authorization: `Bearer ${params.sign.token}`,
      "Content-Type": params.mimeType,
      "x-upsert": "true"
    }
  });
}

async function postWithQueryToken(params: {
  sign: SignResult;
  imageBytes: Buffer;
  mimeType: string;
}): Promise<void> {
  const uploadUrl = buildSignedUploadUrl(params.sign.signedUrl, params.sign.token);
  await axios.post(uploadUrl, params.imageBytes, {
    ...supabaseUploadConfig,
    headers: {
      "Content-Type": params.mimeType,
      "x-upsert": "true"
    }
  });
}

async function uploadBytesToSupabase(params: {
  sign: SignResult;
  imageBytes: Buffer;
  mimeType: string;
}): Promise<void> {
  // Hard guard: never PUT/POST image bytes to Vercel / API hosts.
  api.assertScreenshotStorageUrl(params.sign.signedUrl);

  const strategies: Array<{ name: string; run: () => Promise<void> }> = [
    { name: "put-signed-url-as-is", run: () => putSignedUrlAsIs(params) },
    { name: "put-query-token", run: () => putWithQueryToken(params) },
    { name: "put-bearer-token", run: () => putWithBearerToken(params) },
    { name: "post-query-token", run: () => postWithQueryToken(params) }
  ];

  let lastError: unknown;
  for (const strategy of strategies) {
    try {
      await strategy.run();
      return;
    } catch (error) {
      lastError = error;
      const status = httpStatus(error);
      const responsePreview =
        axios.isAxiosError(error) && error.response?.data != null
          ? JSON.stringify(error.response.data).slice(0, 240)
          : undefined;
      logger.warn("screenshot-supabase-upload-strategy-failed", {
        strategy: strategy.name,
        status,
        path: params.sign.path,
        uploadUrlHost: safeUrlHost(params.sign.signedUrl),
        responsePreview
      });
      if (status === 405 && strategy.name === "put-query-token") {
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("screenshot-supabase-upload-failed");
}

async function signWithRetries(
  payload: ScreenshotUploadPayload,
  uploadUuid: string,
  options: api.AuthAwareRequestOptions
): Promise<SignResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < SIGN_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await api.signScreenshotUpload(buildSignInput(payload, uploadUuid), options);
    } catch (error) {
      lastError = error;
      if (error instanceof api.ApiError && (error.statusCode === 403 || error.kind === "auth")) {
        throw error;
      }
      if (!isTransientNetworkError(error)) {
        throw error;
      }
      if (attempt === SIGN_MAX_ATTEMPTS - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMsForAttempt(attempt)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("screenshot-sign-failed");
}

async function uploadToSupabaseWithRetries(
  sign: SignResult,
  payload: ScreenshotUploadPayload,
  options: api.AuthAwareRequestOptions,
  uploadUuid: string
): Promise<SignResult> {
  let activeSign = sign;
  let lastError: unknown;

  for (let attempt = 0; attempt < SUPABASE_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      await uploadBytesToSupabase({
        sign: activeSign,
        imageBytes: payload.imageBytes,
        mimeType: payload.mimeType
      });
      return activeSign;
    } catch (error) {
      lastError = error;
      logger.warn("screenshot-supabase-upload-failed", {
        uploadUuid,
        attempt: attempt + 1,
        status: httpStatus(error),
        path: activeSign.path
      });
      if (!shouldResignForUploadError(error)) {
        break;
      }
      if (attempt < SUPABASE_UPLOAD_MAX_ATTEMPTS - 1) {
        activeSign = await api.signScreenshotUpload(buildSignInput(payload, uploadUuid), options);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMsForAttempt(attempt)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("screenshot-supabase-upload-failed");
}

async function commitWithRetries(
  payload: ScreenshotUploadPayload,
  sign: SignResult,
  uploadUuid: string,
  options: api.AuthAwareRequestOptions
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < COMMIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await api.commitScreenshotMetadata(
        {
          path: sign.path,
          uploadUuid,
          capturedAtIso: payload.capturedAt,
          mimeType: payload.mimeType,
          projectId: payload.projectId ?? undefined,
          sessionId: payload.sessionId,
          workSessionId: payload.sessionId,
          metadata: {
            ...(payload.metadata ?? {}),
            uploadUuid
          }
        },
        options
      );
      if (result.duplicate) {
        logger.info("screenshot-commit-duplicate", { uploadUuid, screenshotId: result.screenshotId });
      }
      return;
    } catch (error) {
      lastError = error;
      const status = error instanceof api.ApiError ? error.statusCode : null;
      if (status === 409 && attempt < COMMIT_MAX_ATTEMPTS - 1) {
        await uploadBytesToSupabase({
          sign,
          imageBytes: payload.imageBytes,
          mimeType: payload.mimeType
        });
        await new Promise((resolve) => setTimeout(resolve, delayMsForAttempt(attempt)));
        continue;
      }
      if (!isTransientNetworkError(error)) {
        throw error;
      }
      if (attempt === COMMIT_MAX_ATTEMPTS - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMsForAttempt(attempt)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("screenshot-commit-failed");
}

/**
 * Screenshot upload: sign (JSON via API) → image bytes to Supabase storage → commit (JSON via API).
 * Image bytes never pass through Vercel. On failure callers should queue locally.
 */
export async function uploadScreenshotDirect(
  payload: ScreenshotUploadPayload,
  options: api.AuthAwareRequestOptions
): Promise<{ uploadUuid: string; path: string }> {
  const uploadUuid = resolveUploadUuid(payload);
  const enriched: ScreenshotUploadPayload = {
    ...payload,
    metadata: {
      ...(payload.metadata ?? {}),
      uploadUuid
    }
  };

  const sign = await signWithRetries(enriched, uploadUuid, options);
  const confirmedSign = await uploadToSupabaseWithRetries(sign, enriched, options, uploadUuid);
  await commitWithRetries(enriched, confirmedSign, uploadUuid, options);

  logger.info("screenshot-uploaded-direct", {
    uploadUuid,
    path: confirmedSign.path,
    bytes: enriched.imageBytes.length
  });

  return { uploadUuid, path: confirmedSign.path };
}

export function isScreenshotSupabaseForbidden(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}
