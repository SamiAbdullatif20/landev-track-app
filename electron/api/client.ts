/**
 * Thin web/API connection layer for the LANDEV desktop shell.
 * Auth + reachability + Supabase screenshot sign/commit (image bytes go to storage, not Vercel).
 */
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { readEnv } from "../config/env";
import { logger } from "../config/logger";
import { API_ENDPOINTS } from "./endpoints";
import { formatAxiosErrorBody, formatUnknownErrorMessage } from "./error-message";

export type LoginInput = {
  username: string;
  password: string;
};

export type ScreenshotIngestInput = {
  capturedAt: string;
  imageBytes: Buffer;
  mimeType: "image/png" | "image/jpeg";
  projectId?: string | null;
  sessionId?: string;
};

export type ScreenshotSignInput = {
  capturedAtIso: string;
  mimeType: "image/png" | "image/jpeg";
  uploadUuid: string;
  byteSize?: number;
  projectId?: string | null;
  sessionId?: string;
};

export type ScreenshotSignResult = {
  path: string;
  token: string;
  signedUrl: string;
  uploadUuid: string;
  mimeType: "image/png" | "image/jpeg";
  capturedAtIso: string;
};

export type ScreenshotCommitInput = {
  uploadUuid: string;
  path: string;
  capturedAtIso: string;
  mimeType: "image/png" | "image/jpeg";
  byteSize?: number;
  projectId?: string | null;
  sessionId?: string;
  workSessionId?: string;
  metadata?: Record<string, unknown>;
};

export type ScreenshotCommitResult = {
  duplicate: boolean;
  screenshotId?: string;
};

export class ApiError extends Error {
  public readonly kind: "network" | "auth" | "server" | "validation";
  public readonly statusCode?: number;
  public readonly responsePreview?: string;

  constructor(
    kind: "network" | "auth" | "server" | "validation",
    message: string,
    options?: { statusCode?: number; responsePreview?: string }
  ) {
    super(message);
    this.kind = kind;
    this.statusCode = options?.statusCode;
    this.responsePreview = options?.responsePreview;
  }
}

type RequestOptions = {
  token?: string;
  sessionCookie?: string;
  onSessionCookie?: (cookie: string) => void;
};

export type AuthAwareRequestOptions = RequestOptions & {
  onAuthRefresh?: () => Promise<RequestOptions | null>;
};

let client: ReturnType<typeof axios.create> | null = null;
let cachedRoles: string[] = [];

function getClient() {
  if (client) return client;
  const env = readEnv();
  const normalizedBaseUrl = env.VITE_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  client = axios.create({
    baseURL: normalizedBaseUrl,
    timeout: 15_000,
    withCredentials: true
  });
  return client;
}

function previewAxiosResponseBody(data: unknown): string | undefined {
  if (data == null) return undefined;
  try {
    const text = typeof data === "string" ? data : JSON.stringify(data);
    return text.slice(0, 220);
  } catch {
    return undefined;
  }
}

function mapAxiosError(error: unknown): ApiError {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    const issueMessage =
      formatUnknownErrorMessage(firstIssue) ?? firstIssue?.message ?? "Response validation failed.";
    return new ApiError("validation", issueMessage);
  }

  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return new ApiError("validation", error.message);
    }
    return new ApiError("server", "Unexpected error while talking to server.");
  }

  const axiosError = error as AxiosError<unknown>;
  if (!axiosError.response) {
    return new ApiError("network", "Network unavailable. Check your connection and retry.");
  }

  const status = axiosError.response.status;
  const errorOptions = {
    statusCode: status,
    responsePreview: previewAxiosResponseBody(axiosError.response.data)
  };
  if (status === 401 || status === 403) {
    return new ApiError("auth", formatAxiosErrorBody(axiosError.response.data, status), errorOptions);
  }
  if (status >= 500) {
    return new ApiError("server", formatAxiosErrorBody(axiosError.response.data, status), errorOptions);
  }
  return new ApiError(
    "validation",
    formatAxiosErrorBody(axiosError.response.data, status),
    errorOptions
  );
}

export async function withAuthRetry<T>(
  fn: (options: RequestOptions) => Promise<T>,
  options: AuthAwareRequestOptions
): Promise<T> {
  try {
    return await fn(options);
  } catch (error) {
    const mapped = mapAxiosError(error);
    if (mapped.kind !== "auth" || !options.onAuthRefresh) {
      throw mapped;
    }
    const refreshed = await options.onAuthRefresh();
    if (!refreshed) {
      throw mapped;
    }
    logger.info("auth-retry-request");
    return await fn(refreshed);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const shouldRetry = !status || status >= 500 || status === 429;
      if (!shouldRetry || attempt === retries - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw mapAxiosError(lastError);
}

function authHeader(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.sessionCookie) {
    headers.Cookie = options.sessionCookie;
  }
  return headers;
}

function extractCookieHeader(setCookie: string[] | undefined): string | null {
  if (!setCookie || setCookie.length === 0) {
    return null;
  }
  return setCookie.map((entry) => entry.split(";")[0]?.trim()).filter(Boolean).join("; ");
}

function persistCookieIfPresent(response: AxiosResponse, options: RequestOptions): void {
  const cookie = extractCookieHeader(response.headers["set-cookie"] as string[] | undefined);
  if (cookie && options.onSessionCookie) {
    options.onSessionCookie(cookie);
  }
}

async function firstSuccess<T>(paths: readonly string[], call: (path: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      return await call(path);
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function roleStringsFromValue(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : null))
      .filter((item): item is string => Boolean(item));
  }
  return [];
}

function extractRolesFromPayload(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  const direct = roleStringsFromValue(record.roles);
  if (direct.length > 0) return direct;
  const user = record.user;
  if (user && typeof user === "object") {
    return roleStringsFromValue((user as Record<string, unknown>).roles);
  }
  return [];
}

function extractLoginToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  for (const key of ["token", "accessToken", "access_token"] as const) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key].trim();
    }
  }
  return null;
}

function buildLoginBody(payload: LoginInput): Record<string, string> {
  return {
    username: payload.username,
    email: payload.username,
    password: payload.password
  };
}

export function readCachedUserRoles(): string[] {
  return [...cachedRoles];
}

export function saveCachedUserRoles(roles: string[]): void {
  cachedRoles = [...roles];
}

export function clearCachedUserRoles(): void {
  cachedRoles = [];
}

export async function fetchUserRoles(options: RequestOptions): Promise<string[]> {
  const http = getClient();
  try {
    const response = await firstSuccess(API_ENDPOINTS.auth.me, (path) =>
      http.get(path, { headers: authHeader(options) })
    );
    persistCookieIfPresent(response, options);
    const roles = extractRolesFromPayload(response.data);
    if (roles.length > 0) {
      saveCachedUserRoles(roles);
    }
    return roles.length > 0 ? roles : readCachedUserRoles();
  } catch {
    return readCachedUserRoles();
  }
}

export async function login(
  payload: LoginInput,
  options: RequestOptions
): Promise<{ token: string | null; sessionCookie: string | null; roles: string[] }> {
  return withRetry(async () => {
    const http = getClient();
    const response = await http.post(API_ENDPOINTS.auth.login, buildLoginBody(payload), {
      headers: authHeader(options)
    });
    persistCookieIfPresent(response, options);
    const sessionCookie = extractCookieHeader(response.headers["set-cookie"] as string[] | undefined);
    const token = extractLoginToken(response.data);
    const loginRoles = extractRolesFromPayload(response.data);
    if (loginRoles.length > 0) {
      saveCachedUserRoles(loginRoles);
    }
    const roles = loginRoles.length > 0 ? loginRoles : await fetchUserRoles(options);
    if (!token && !sessionCookie && roles.length === 0) {
      throw new ApiError("auth", "Login did not return a session. Check your username and password.");
    }
    return { token, sessionCookie, roles };
  });
}

export async function probeSession(options: RequestOptions): Promise<{ authenticated: boolean }> {
  if (!options.token && !options.sessionCookie) {
    return { authenticated: false };
  }
  try {
    const http = getClient();
    const response = await firstSuccess(API_ENDPOINTS.auth.me, (path) =>
      http.get(path, { headers: authHeader(options) })
    );
    persistCookieIfPresent(response, options);
    return { authenticated: true };
  } catch (error) {
    if (error instanceof ApiError && error.kind === "auth") {
      return { authenticated: false };
    }
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      return { authenticated: false };
    }
    throw mapAxiosError(error);
  }
}

export async function logout(options: RequestOptions): Promise<void> {
  try {
    const http = getClient();
    await firstSuccess(API_ENDPOINTS.auth.logout, (path) =>
      http.post(path, {}, { headers: authHeader(options), timeout: 8_000 })
    );
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : null;
    if (status === 404 || status === 401 || status === 403) {
      return;
    }
    logger.warn("auth-logout-request-failed", {
      error: error instanceof Error ? error.message : "unknown",
      status
    });
  }
}

export async function testConnection(): Promise<{ reachable: boolean; message: string }> {
  try {
    const http = getClient();
    await http.post(API_ENDPOINTS.auth.login, { username: "_probe_", password: "_probe_" });
    return { reachable: true, message: "Backend reachable" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { reachable: true, message: `Backend reachable (HTTP ${error.response.status})` };
    }
    return { reachable: false, message: "Backend is unreachable." };
  }
}

const screenshotSignResponseSchema = z
  .object({
    ok: z.literal(true).optional(),
    path: z.string().min(1).optional(),
    storagePath: z.string().min(1).optional(),
    token: z.string().min(1),
    signedUrl: z.string().url().optional(),
    uploadUrl: z.string().url().optional(),
    uploadUuid: z.string().optional(),
    mimeType: z.string().optional(),
    contentType: z.string().optional(),
    capturedAtIso: z.string().optional(),
    capturedAt: z.string().optional()
  })
  .refine((data) => Boolean(data.path || data.storagePath), {
    message: "path or storagePath required"
  })
  .refine((data) => Boolean(data.signedUrl || data.uploadUrl), {
    message: "signedUrl or uploadUrl required"
  });

function buildScreenshotSignRequestBody(payload: ScreenshotSignInput): Record<string, unknown> {
  return {
    uploadUuid: payload.uploadUuid,
    capturedAtIso: payload.capturedAtIso,
    capturedAt: payload.capturedAtIso,
    mimeType: payload.mimeType,
    contentType: payload.mimeType,
    ...(typeof payload.byteSize === "number" ? { byteSize: payload.byteSize } : {}),
    ...(payload.projectId ? { projectId: payload.projectId } : {}),
    ...(payload.sessionId
      ? { sessionId: payload.sessionId, workSessionId: payload.sessionId }
      : {})
  };
}

function parseScreenshotSignResponse(
  data: unknown,
  payload: ScreenshotSignInput
): ScreenshotSignResult {
  const parsed = screenshotSignResponseSchema.parse(data);
  const path = parsed.path ?? parsed.storagePath!;
  const signedUrl = parsed.signedUrl ?? parsed.uploadUrl!;
  assertScreenshotStorageUrl(signedUrl);
  return {
    path,
    token: parsed.token,
    signedUrl,
    uploadUuid: parsed.uploadUuid ?? payload.uploadUuid,
    mimeType: (parsed.mimeType ?? parsed.contentType ?? payload.mimeType) as
      | "image/png"
      | "image/jpeg",
    capturedAtIso: parsed.capturedAtIso ?? parsed.capturedAt ?? payload.capturedAtIso
  };
}

/**
 * Reject signed upload URLs that target the web/API host.
 * Image bytes must go to object storage (Supabase), never through Vercel.
 */
export function assertScreenshotStorageUrl(signedUrl: string): void {
  let host: string;
  try {
    host = new URL(signedUrl).hostname.toLowerCase();
  } catch {
    throw new ApiError("validation", "Invalid screenshot upload URL from sign API.");
  }

  let apiHost = "";
  try {
    apiHost = new URL(readEnv().VITE_API_BASE_URL).hostname.toLowerCase();
  } catch {
    apiHost = "";
  }

  if (
    host.includes("vercel.app") ||
    (apiHost && (host === apiHost || host.endsWith(`.${apiHost}`)))
  ) {
    throw new ApiError(
      "validation",
      `Screenshot signed URL must target storage, not the web API (${host}).`
    );
  }
}

const screenshotCommitResponseSchema = z.object({
  ok: z.literal(true),
  duplicate: z.boolean().optional(),
  screenshotId: z.string().optional()
});

/** Ask the web API for a Supabase signed upload URL (JSON only — no image body). */
export async function signScreenshotUpload(
  payload: ScreenshotSignInput,
  options: AuthAwareRequestOptions
): Promise<ScreenshotSignResult> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const response = await http.post(
      API_ENDPOINTS.tracking.screenshotsSign,
      buildScreenshotSignRequestBody(payload),
      { headers: authHeader(requestOptions) }
    );
    persistCookieIfPresent(response, requestOptions);
    return parseScreenshotSignResponse(response.data, payload);
  }, options);
}

/** Commit screenshot metadata after bytes were uploaded to Supabase storage. */
export async function commitScreenshotMetadata(
  payload: ScreenshotCommitInput,
  options: AuthAwareRequestOptions
): Promise<ScreenshotCommitResult> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const response = await http.post(
      API_ENDPOINTS.tracking.screenshotsCommit,
      {
        ...payload,
        storagePath: payload.path
      },
      { headers: authHeader(requestOptions) }
    );
    persistCookieIfPresent(response, requestOptions);
    const parsed = screenshotCommitResponseSchema.parse(response.data);
    return {
      duplicate: parsed.duplicate ?? false,
      screenshotId: parsed.screenshotId
    };
  }, options);
}

/** Batch APP_FOCUS (and other) events — JSON only. */
export async function postTrackingEventsBatch(
  payload: { events: Record<string, unknown>[] },
  options: AuthAwareRequestOptions
): Promise<{ ok: boolean }> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const response = await http.post(
      API_ENDPOINTS.tracking.eventsBatch,
      { events: payload.events },
      { headers: authHeader(requestOptions), timeout: 30_000 }
    );
    persistCookieIfPresent(response, requestOptions);
    return { ok: true };
  }, options);
}

/* ─── Projects & profile ─────────────────────────────────────────────────── */

export type Project = {
  id: string;
  name: string;
  displayLabel: string;
  searchLabel: string;
  projectNumber: string | null;
  projectAddress: string | null;
  clientName: string | null;
};

export type UserProfile = {
  id: string | null;
  name: string;
  username: string;
  email: string | null;
  roles: string[];
};

function asStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function mapProjectRow(source: Record<string, unknown>): Project | null {
  const id = asStringOrNull(source.id ?? source.projectId ?? source.project_id ?? source._id);
  const name = asStringOrNull(
    source.name
      ?? source.title
      ?? source.projectName
      ?? source.project_name
      ?? source.displayLabel
      ?? source.projectNumber
  );
  if (!id || !name) return null;
  const projectNumber = asStringOrNull(source.projectNumber ?? source.project_number ?? source.code);
  const projectAddress = asStringOrNull(
    source.projectAddress ?? source.project_address ?? source.address
  );
  const clientRaw = source.clientName ?? source.client_name ?? source.client;
  const clientName =
    clientRaw && typeof clientRaw === "object"
      ? asStringOrNull(
          (clientRaw as Record<string, unknown>).name
            ?? (clientRaw as Record<string, unknown>).title
        )
      : asStringOrNull(clientRaw);
  const explicitDisplay = asStringOrNull(source.displayLabel ?? source.display_label);
  // Prefer the human-readable project name in lists — never fall back to
  // projectNumber ahead of name (API displayLabel is often just the number).
  const displayLabel =
    (name && name !== projectNumber ? name : null)
    ?? (explicitDisplay && explicitDisplay !== projectNumber ? explicitDisplay : null)
    ?? name
    ?? explicitDisplay
    ?? projectNumber
    ?? id;
  const searchLabel =
    asStringOrNull(source.searchLabel ?? source.search_label)
    ?? [name, clientName, projectNumber, projectAddress].filter(Boolean).join(" ")
    ?? name;
  return { id, name, displayLabel, searchLabel, projectNumber, projectAddress, clientName };
}

function normalizeProjectsPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["projects", "assignedProjects", "assigned_projects", "data", "items", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of ["projects", "items", "results"]) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
      }
    }
  }
  return [];
}

function parseNextCursor(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const root = asStringOrNull(record.nextCursor ?? record.next_cursor);
  if (root) return root;
  const pagination = record.pagination ?? record.meta;
  if (pagination && typeof pagination === "object") {
    const page = pagination as Record<string, unknown>;
    if (page.hasMore === false || page.has_more === false) return null;
    return asStringOrNull(page.nextCursor ?? page.next_cursor ?? page.next);
  }
  return null;
}

export async function fetchProjects(options: AuthAwareRequestOptions): Promise<Project[]> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const merged = new Map<string, Project>();
    let cursor: string | null = null;
    let page = 0;
    do {
      page += 1;
      if (page > 100) break;
      const response = await http.get(API_ENDPOINTS.tracking.projects, {
        headers: authHeader(requestOptions),
        params: { limit: 200, ...(cursor ? { cursor } : {}) }
      });
      persistCookieIfPresent(response, requestOptions);
      for (const item of normalizeProjectsPayload(response.data)) {
        if (!item || typeof item !== "object") continue;
        const mapped = mapProjectRow(item as Record<string, unknown>);
        if (mapped) merged.set(mapped.id, mapped);
      }
      cursor = parseNextCursor(response.data);
    } while (cursor);
    return Array.from(merged.values()).sort((a, b) => {
      const aPin = isAdminNewTaskLabel(a.displayLabel, a.name) ? 0 : 1;
      const bPin = isAdminNewTaskLabel(b.displayLabel, b.name) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return a.displayLabel.localeCompare(b.displayLabel, undefined, { sensitivity: "base" });
    });
  }, options);
}

function isAdminNewTaskLabel(...labels: Array<string | null | undefined>): boolean {
  return labels.some((label) => {
    if (!label) return false;
    const normalized = label
      .trim()
      .toLowerCase()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ");
    return normalized === "admin - new task" || normalized.includes("admin - new task");
  });
}

export async function fetchUserProfile(options: RequestOptions): Promise<UserProfile> {
  const http = getClient();
  const response = await firstSuccess(API_ENDPOINTS.auth.me, (path) =>
    http.get(path, { headers: authHeader(options) })
  );
  persistCookieIfPresent(response, options);
  const data = (response.data && typeof response.data === "object"
    ? (response.data as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const user =
    data.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : data;
  const roles = extractRolesFromPayload(response.data);
  if (roles.length > 0) saveCachedUserRoles(roles);
  const username =
    asStringOrNull(user.username ?? user.email ?? data.username ?? data.email) ?? "User";
  const name =
    asStringOrNull(user.name ?? user.fullName ?? user.full_name ?? data.name) ?? username;
  return {
    id: asStringOrNull(user.id ?? data.id),
    name,
    username,
    email: asStringOrNull(user.email ?? data.email),
    roles: roles.length > 0 ? roles : readCachedUserRoles()
  };
}

/* ─── Tracking sessions ──────────────────────────────────────────────────── */

export type SessionStartInput = {
  projectId: string;
  projectName?: string;
  description: string;
  clientTimeZone: string;
  startTimeUtc: string;
  workDateKey?: string;
};

export type SessionStopInput = {
  sessionId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  startedAt?: string;
  stoppedAt: string;
  durationMs?: number;
  clientTimeZone?: string;
  description?: string;
  workDateKey?: string;
};

function workDateKeyFromIso(iso: string, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fall through
  }
  return iso.slice(0, 10);
}

function extractSessionId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  for (const key of ["sessionId", "workSessionId", "id", "work_session_id"]) {
    const value = asStringOrNull(record[key]);
    if (value) return value;
  }
  const nested = record.session ?? record.workSession ?? record.data;
  if (nested && typeof nested === "object") {
    return extractSessionId(nested);
  }
  return null;
}

/**
 * Start a work session with full live-clock fields for the web dashboard:
 * startedAt / startTime / startTimeUtc + SESSION_START trailing event.
 */
export async function startTrackingSession(
  payload: SessionStartInput,
  options: AuthAwareRequestOptions
): Promise<{ sessionId: string | null }> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const startedAt = payload.startTimeUtc;
    const workDateKey =
      payload.workDateKey ?? workDateKeyFromIso(startedAt, payload.clientTimeZone);
    const eventUuid = randomUUID();
    const body = {
      projectId: payload.projectId,
      projectName: payload.projectName,
      description: payload.description,
      workDetails: payload.description,
      work_details: payload.description,
      details: payload.description,
      clientTimeZone: payload.clientTimeZone,
      workDateKey,
      startTime: startedAt,
      startedAt,
      startTimeUtc: startedAt,
      occurredAt: startedAt,
      // Enables immediate live-counter start on web without waiting for poll.
      trailingEvents: [
        {
          eventUuid,
          eventKind: "SESSION_START",
          type: "SESSION_START",
          occurredAtIso: startedAt,
          occurredAt: startedAt,
          workDateKey,
          clientTimeZone: payload.clientTimeZone,
          projectId: payload.projectId,
          projectName: payload.projectName,
          description: payload.description,
          source: "DESKTOP_AGENT"
        }
      ]
    };
    try {
      const response = await http.post(API_ENDPOINTS.tracking.sessionStart, body, {
        headers: authHeader(requestOptions)
      });
      persistCookieIfPresent(response, requestOptions);
      return { sessionId: extractSessionId(response.data) };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const fallback = await firstSuccess(API_ENDPOINTS.attendance.today, (path) =>
          http.post(
            path,
            { ...body, action: "start" },
            { headers: authHeader(requestOptions) }
          )
        );
        persistCookieIfPresent(fallback, requestOptions);
        return { sessionId: extractSessionId(fallback.data) };
      }
      throw mapAxiosError(error);
    }
  }, options);
}

export async function stopTrackingSession(
  payload: SessionStopInput,
  options: AuthAwareRequestOptions
): Promise<{ ok: boolean; sessionId: string | null }> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const stoppedAt = payload.stoppedAt;
    const workDateKey =
      payload.workDateKey ??
      workDateKeyFromIso(stoppedAt, payload.clientTimeZone ?? "UTC");
    const eventUuid = randomUUID();
    const body: Record<string, unknown> = {
      stoppedAt,
      stopTimeUtc: stoppedAt,
      endTime: stoppedAt,
      occurredAt: stoppedAt,
      workDateKey,
      trailingEvents: [
        {
          eventUuid,
          eventKind: "SESSION_STOP",
          type: "SESSION_STOP",
          occurredAtIso: stoppedAt,
          occurredAt: stoppedAt,
          workDateKey,
          clientTimeZone: payload.clientTimeZone,
          sessionId: payload.sessionId,
          workSessionId: payload.sessionId,
          source: "DESKTOP_AGENT"
        }
      ]
    };
    if (payload.sessionId) {
      body.sessionId = payload.sessionId;
      body.workSessionId = payload.sessionId;
    }
    if (payload.projectId) body.projectId = payload.projectId;
    if (payload.projectName) body.projectName = payload.projectName;
    if (payload.startedAt) {
      body.startedAt = payload.startedAt;
      body.startTime = payload.startedAt;
      body.startTimeUtc = payload.startedAt;
    }
    if (typeof payload.durationMs === "number") {
      body.durationMs = payload.durationMs;
      body.trackedDurationMs = payload.durationMs;
      body.durationSeconds = Math.round(payload.durationMs / 1000);
    }
    if (payload.clientTimeZone) {
      body.clientTimeZone = payload.clientTimeZone;
      body.timezone = payload.clientTimeZone;
    }
    if (payload.description) {
      body.description = payload.description;
      body.workDetails = payload.description;
    }
    try {
      const response = await http.post(API_ENDPOINTS.tracking.sessionStop, body, {
        headers: authHeader(requestOptions)
      });
      persistCookieIfPresent(response, requestOptions);
      return { ok: true, sessionId: extractSessionId(response.data) ?? payload.sessionId ?? null };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await firstSuccess(API_ENDPOINTS.attendance.today, (path) =>
          http.post(
            path,
            { ...body, action: "end" },
            { headers: authHeader(requestOptions) }
          )
        );
        return { ok: true, sessionId: payload.sessionId ?? null };
      }
      throw mapAxiosError(error);
    }
  }, options);
}

export async function fetchActiveSessionId(options: AuthAwareRequestOptions): Promise<string | null> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const paths = [
      API_ENDPOINTS.tracking.sessionActive,
      API_ENDPOINTS.tracking.sessionStatus,
      ...API_ENDPOINTS.attendance.today
    ];
    for (const path of paths) {
      try {
        const response = await http.get(path, { headers: authHeader(requestOptions) });
        persistCookieIfPresent(response, requestOptions);
        const data = response.data;
        if (data && typeof data === "object") {
          const record = data as Record<string, unknown>;
          const active = record.active ?? record.isActive ?? record.is_active;
          if (active === false) continue;
          const id = extractSessionId(data);
          if (id) return id;
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) continue;
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          throw mapAxiosError(error);
        }
      }
    }
    return null;
  }, options);
}
