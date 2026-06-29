import axios, { AxiosError, type AxiosResponse } from "axios";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { readEnv } from "../config/env";
import { getWorkDateKey } from "../utils/work-date-key";
import { API_ENDPOINTS } from "./endpoints";
import { logger } from "../config/logger";
import { getSetting, setSetting } from "../db/queue-repo";
import { isCatalogProjectId, isNonChargeableProjectName } from "../config/role-project-catalog";
import { parseRemoteSessionStatus, type RemoteSessionStatus } from "../services/session-remote-status";
import { formatAxiosErrorBody, formatUnknownErrorMessage } from "./error-message";

export type { RemoteSessionStatus };

export type LoginInput = {
  username: string;
  password: string;
};

export type MeResponse = {
  id: string;
  username: string;
  roles: string[];
};

export type Project = {
  id: string;
  name: string;
  /** Primary UI line (e.g. project number). */
  displayLabel: string;
  /** Search/filter text (e.g. site address). */
  searchLabel: string;
  projectNumber: string | null;
  projectAddress: string | null;
  clientName: string | null;
  isNonChargeable?: boolean;
};

export type SessionStartInput = {
  projectId: string;
  /** Display name for catalog / admin rows (no backend project id). */
  projectName?: string;
  isNonChargeable?: boolean;
  description: string;
  /** IANA zone from desktop OS (e.g. Europe/Istanbul) for per-employee reporting / late-start bands */
  clientTimeZone: string;
  /** ISO-8601 UTC instant when user pressed Start; forwarded for WorkSession.startTime alignment */
  startTimeUtc?: string;
};

export type TrackingEventInput = {
  sessionId?: string;
  type: string;
  occurredAt: string;
  eventUuid?: string;
  eventKind?: string;
  metadata?: Record<string, unknown>;
};

export type SessionLifecycleTrailingEvent = {
  eventUuid: string;
  eventKind: "SESSION_START" | "SESSION_STOP";
  occurredAtIso: string;
  workDateKey: string;
  source: "DESKTOP_AGENT";
  metadata?: Record<string, unknown>;
};

export type SessionStopReason = "USER" | "INACTIVITY_AUTO";

/** @deprecated Use SessionLifecycleTrailingEvent */
export type SessionStopTrailingEvent = SessionLifecycleTrailingEvent & {
  eventKind: "SESSION_STOP";
};

export type SessionStopInput = {
  sessionId?: string | null;
  stoppedAt: string;
  /** ISO start of this segment; server should prefer this + stoppedAt for duration. */
  startedAt?: string;
  /** Wall-clock tracked ms (stoppedAt - startedAt) from desktop. */
  durationMs?: number;
  /** Employee local work date at stop (YYYY-MM-DD). */
  workDateKey?: string;
  /** Same as startedAt — segment boundary for multi start/stop days. */
  sessionSegmentStartedAt?: string;
  projectId?: string | null;
  /** IANA zone at stop time (desktop). */
  clientTimeZone?: string;
  /** Alias used by web stop API (`timezone`). */
  timezone?: string;
  /** Stable per-install device id. */
  deviceUuid?: string;
  /** Immediate SESSION_STOP signal for web live-timer cutoff. */
  trailingEvents?: SessionLifecycleTrailingEvent[];
  /** Why the desktop ended the session (user stop vs inactivity auto-stop). */
  stopReason?: SessionStopReason;
};

export type ScreenshotIngestInput = {
  capturedAt: string;
  imageBytes: Buffer;
  mimeType: "image/png" | "image/jpeg";
  projectId: string | null;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

export type SessionStopResult = {
  ok: true;
  queued: boolean;
  endpointPath: string;
  status: number | null;
  confirmedBy: "tracking" | "attendance" | "idempotent";
  sessionId: string | null;
  timesheetId: string | null;
  responsePreview: string | null;
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
  /** Called once on 401/403 to refresh session before retrying the same request. */
  onAuthRefresh?: () => Promise<RequestOptions | null>;
};

export const BATCH_TRACKING_EVENT_KINDS = [
  "INPUT_ACTIVITY",
  "APP_FOCUS",
  "HEARTBEAT",
  "ACTIVITY_INTERVAL"
] as const;

export type TrackingBatchEventInput = TrackingEventInput & {
  eventUuid: string;
  eventKind: string;
};

let client: ReturnType<typeof axios.create> | null = null;

function getClient() {
  if (client) return client;
  const env = readEnv();
  const normalizedBaseUrl = env.VITE_API_BASE_URL
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
  client = axios.create({
    baseURL: normalizedBaseUrl,
    timeout: 15_000,
    withCredentials: true
  });
  return client;
}

const loginResponseSchema = z
  .object({
    token: z.string().optional(),
    accessToken: z.string().optional(),
    access_token: z.string().optional()
  })
  .passthrough();
const projectSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  name: z
    .union([z.string(), z.number()])
    .transform((value) => String(value)),
  displayLabel: z.string().optional(),
  searchLabel: z.string().optional(),
  projectNumber: z.string().nullable(),
  projectAddress: z.string().nullable().optional(),
  clientName: z.string().nullable(),
  isNonChargeable: z.boolean().nullish()
});
const projectsResponseSchema = z.array(projectSchema);
const startResponseSchema = z.object({ sessionId: z.string().min(1).nullable().optional() });

export function parseProjectsNextCursor(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const record = payload as Record<string, unknown>;

  const rootCursor = asStringOrNull(record.nextCursor ?? record.next_cursor);
  if (rootCursor) {
    return rootCursor;
  }

  const pagination = record.pagination ?? record.meta;
  if (pagination && typeof pagination === "object") {
    const page = pagination as Record<string, unknown>;
    const hasMore = page.hasMore ?? page.has_more;
    if (hasMore === false) {
      return null;
    }
    const next = asStringOrNull(page.nextCursor ?? page.next_cursor ?? page.next);
    if (next) {
      return next;
    }
  }

  return null;
}

/** Safety cap: 200 projects/page × 100 pages */
export const PROJECTS_MAX_PAGES = 100;

function mapRawProjectRecord(source: Record<string, unknown>): Omit<Project, "isNonChargeable"> | null {
  const id = asStringOrNull(source.id ?? source.projectId ?? source.project_id ?? source._id);
  const name = asStringOrNull(source.name ?? source.title ?? source.projectName ?? source.project_name);
  if (id == null || name == null) {
    return null;
  }
  const displayLabelRaw = source.displayLabel ?? source.display_label ?? null;
  const searchLabelRaw = source.searchLabel ?? source.search_label ?? null;
  const projectAddressRaw =
    source.projectAddress ?? source.project_address ?? source.address ?? null;
  const projectNumberRaw = source.projectNumber ?? source.project_number ?? source.code ?? null;
  const clientRaw = source.clientName ?? source.client_name ?? source.client ?? null;
  const clientName =
    clientRaw && typeof clientRaw === "object"
      ? (clientRaw as Record<string, unknown>).name
        ?? (clientRaw as Record<string, unknown>).title
        ?? (clientRaw as Record<string, unknown>).companyName
        ?? null
      : clientRaw;
  const projectNumber = asStringOrNull(projectNumberRaw);
  const projectAddress = asStringOrNull(projectAddressRaw);
  const clientNameStr = asStringOrNull(clientName);
  const displayLabel =
    asStringOrNull(displayLabelRaw)?.trim()
    || projectNumber?.trim()
    || name.trim();
  const searchLabel =
    asStringOrNull(searchLabelRaw)?.trim()
    || projectAddress?.trim()
    || [name, clientNameStr, projectNumber].filter((part): part is string => Boolean(part?.trim())).join(" ").trim()
    || name.trim();

  return {
    id,
    name,
    displayLabel,
    searchLabel,
    projectNumber,
    projectAddress,
    clientName: clientNameStr
  };
}

function finalizeProjectRows(items: Array<Omit<Project, "isNonChargeable"> & { isNonChargeable?: boolean }>): Project[] {
  const parsed = items
    .map((item) => {
      const result = projectSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter((item): item is z.infer<typeof projectSchema> => item !== null)
    .map((item) => {
      const displayLabel = item.displayLabel?.trim() || item.projectNumber?.trim() || item.name.trim();
      const searchLabel =
        item.searchLabel?.trim()
        || item.projectAddress?.trim()
        || [item.name, item.clientName, item.projectNumber]
          .filter((part): part is string => Boolean(part?.trim()))
          .join(" ")
          .trim()
        || item.name.trim();
      return {
        ...item,
        displayLabel,
        searchLabel,
        projectAddress: item.projectAddress ?? null,
        isNonChargeable: item.isNonChargeable ?? isNonChargeableProjectName(item.name)
      };
    });
  return parsed;
}

function normalizeProjectsPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.projects,
    record.assignedProjects,
    record.data,
    record.items
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function asStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      asStringOrNull(record.id)
      ?? asStringOrNull(record.value)
      ?? asStringOrNull(record.name)
      ?? asStringOrNull(record.title)
      ?? asStringOrNull(record.text)
    );
  }
  return null;
}

function previewAxiosResponseBody(data: unknown): string | undefined {
  if (data == null) {
    return undefined;
  }
  try {
    const text = typeof data === "string" ? data : JSON.stringify(data);
    return text.length > 500 ? `${text.slice(0, 500)}…` : text;
  } catch {
    return undefined;
  }
}

function mapAxiosError(error: unknown): ApiError {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    const issueMessage =
      formatUnknownErrorMessage(firstIssue)
      ?? firstIssue?.message
      ?? "Response validation failed for backend payload.";
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
    const details = formatAxiosErrorBody(axiosError.response.data, status);
    return new ApiError("auth", details, errorOptions);
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
      const retryAfterHeader = axiosError.response?.headers?.["retry-after"];
      const retryAfterRaw = Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader;
      const retryAfterSeconds = Number(retryAfterRaw);
      const retryAfterMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? Math.min(30_000, Math.max(250, retryAfterSeconds * 1000))
          : 450 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
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

function extractCookieHeader(raw: string[] | undefined): string | null {
  if (!raw || raw.length === 0) {
    return null;
  }

  const pairs = raw.map((cookie) => cookie.split(";")[0]).filter(Boolean);
  if (pairs.length === 0) {
    return null;
  }
  return pairs.join("; ");
}

function persistCookieIfPresent(response: AxiosResponse, options: RequestOptions): void {
  const cookie = extractCookieHeader(response.headers["set-cookie"] as string[] | undefined);
  if (cookie && options.onSessionCookie) {
    options.onSessionCookie(cookie);
  }
}

function responseErrorText(error: AxiosError): string {
  const data = error.response?.data;
  if (typeof data === "string") {
    return data;
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.errors;
    if (typeof message === "string") {
      return message;
    }
    if (Array.isArray(message) && typeof message[0] === "string") {
      return message[0];
    }
  }
  return JSON.stringify(data ?? {});
}

function isAlreadyStoppedError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) {
    return false;
  }
  if (error.response.status !== 409 && error.response.status !== 400) {
    return false;
  }
  const message = responseErrorText(error);
  return /already\s+(ended|stopped)|already\s+clocked\s*out|no\s+active\s+session/i.test(message);
}

function toPreview(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data.slice(0, 220);
  return JSON.stringify(data).slice(0, 220);
}

function extractIds(data: unknown): { sessionId: string | null; timesheetId: string | null } {
  if (!data || typeof data !== "object") {
    return { sessionId: null, timesheetId: null };
  }
  const record = data as Record<string, unknown>;
  const sessionObj = record.session && typeof record.session === "object"
    ? (record.session as Record<string, unknown>)
    : null;
  const workSessionObj = record.workSession && typeof record.workSession === "object"
    ? (record.workSession as Record<string, unknown>)
    : null;
  const timesheetObj = record.timesheet && typeof record.timesheet === "object"
    ? (record.timesheet as Record<string, unknown>)
    : null;
  const sessionId = asStringOrNull(
    record.workSessionId
    ?? record.sessionId
    ?? record.session_id
    ?? record.id
    ?? record.trackingSessionId
    ?? workSessionObj?.id
    ?? workSessionObj?.sessionId
    ?? workSessionObj?.session_id
    ?? sessionObj?.sessionId
    ?? sessionObj?.session_id
    ?? sessionObj?.id
    ?? sessionObj?._id
  );
  const timesheetId = asStringOrNull(
    record.timesheetId
    ?? record.timesheet_id
    ?? record.attendanceId
    ?? record.entryId
    ?? timesheetObj?.timesheetId
    ?? timesheetObj?.timesheet_id
    ?? timesheetObj?.id
    ?? timesheetObj?._id
  );
  return { sessionId, timesheetId };
}

function shouldSendSessionId(sessionId: string | null | undefined): boolean {
  if (!sessionId) return false;
  // Old desktop builds generated timestamp-like local IDs (e.g. 13 digits).
  // Do not send those to backend stop endpoint.
  if (/^\d{13,}$/.test(sessionId.trim())) {
    return false;
  }
  return true;
}

export function extractWorkSessionId(data: unknown): string | null {
  const { sessionId } = extractIds(data);
  return shouldSendSessionId(sessionId) ? sessionId : null;
}

/** Resolve today's active work session when start response omits sessionId (common on 2nd start). */
export async function fetchActiveWorkSessionId(options: RequestOptions): Promise<string | null> {
  const client = getClient();
  const headers = authHeader(options);
  const paths = [
    API_ENDPOINTS.tracking.sessionActive,
    API_ENDPOINTS.tracking.sessionStatus,
    ...API_ENDPOINTS.attendance.today
  ];

  for (const path of paths) {
    try {
      const response = await client.get(path, { headers });
      persistCookieIfPresent(response, options);
      const sessionId = extractWorkSessionId(response.data);
      if (sessionId) {
        logger.info("active-work-session-resolved", { path, hasSessionId: true });
        return sessionId;
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      logger.warn("active-work-session-fetch-failed", {
        path,
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return null;
}

/** Poll web for the user's current session (active or stopped). */
export async function fetchRemoteSessionStatus(
  options: AuthAwareRequestOptions
): Promise<RemoteSessionStatus> {
  const client = getClient();
  const headers = authHeader(options);
  const paths = [
    API_ENDPOINTS.tracking.sessionActive,
    API_ENDPOINTS.tracking.sessionStatus,
    ...API_ENDPOINTS.attendance.today
  ];

  for (const path of paths) {
    try {
      const response = await client.get(path, { headers });
      persistCookieIfPresent(response, options);
      const parsed = parseRemoteSessionStatus(response.data);
      if (!parsed) {
        continue;
      }
      if (parsed.sessionId && !shouldSendSessionId(parsed.sessionId)) {
        parsed.sessionId = null;
      }
      logger.info("remote-session-status", {
        path,
        active: parsed.active,
        hasSessionId: Boolean(parsed.sessionId)
      });
      return parsed;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        continue;
      }
      logger.warn("remote-session-status-failed", {
        path,
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return {
    active: false,
    sessionId: null,
    projectId: null,
    projectName: null,
    description: null,
    startedAt: null,
    stoppedAt: null,
    source: null
  };
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

const ROLES_SETTING_KEY = "userRoles";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : null))
    .filter((item): item is string => Boolean(item));
}

function roleStringsFromValue(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    for (const key of ["role", "name", "type", "value"] as const) {
      if (typeof row[key] === "string" && row[key].trim()) {
        return [row[key].trim()];
      }
    }
    return [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      if (typeof row.role === "string" && row.role.trim()) {
        out.push(row.role.trim());
      }
      if (typeof row.name === "string" && row.name.trim()) {
        out.push(row.name.trim());
      }
    }
  }
  return out;
}

function extractRolesFromPayload(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;

  const direct = roleStringsFromValue(record.roles);
  if (direct.length > 0) return direct;

  for (const key of ["role", "userRole", "employeeRole"] as const) {
    const fromKey = roleStringsFromValue(record[key]);
    if (fromKey.length > 0) return fromKey;
  }

  const user = record.user;
  if (user && typeof user === "object") {
    const userRecord = user as Record<string, unknown>;
    const userRoles = roleStringsFromValue(userRecord.roles);
    if (userRoles.length > 0) return userRoles;
    const nestedRole = roleStringsFromValue(userRecord.role);
    if (nestedRole.length > 0) return nestedRole;
  }

  const employee = record.employee;
  if (employee && typeof employee === "object") {
    const employeeRecord = employee as Record<string, unknown>;
    const employeeRole = roleStringsFromValue(employeeRecord.role);
    if (employeeRole.length > 0) return employeeRole;
  }

  return [];
}

export function readCachedUserRoles(): string[] {
  const raw = getSetting(ROLES_SETTING_KEY);
  if (!raw) return [];
  try {
    return roleStringsFromValue(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function saveCachedUserRoles(roles: string[]): void {
  setSetting(ROLES_SETTING_KEY, JSON.stringify(roles));
}

export function clearCachedUserRoles(): void {
  setSetting(ROLES_SETTING_KEY, "[]");
}

export async function fetchUserRoles(options: RequestOptions): Promise<string[]> {
  const client = getClient();
  try {
    const response = await firstSuccess(API_ENDPOINTS.auth.me, (path) =>
      client.get(path, { headers: authHeader(options) })
    );
    persistCookieIfPresent(response, options);
    const roles = extractRolesFromPayload(response.data);
    if (roles.length > 0) {
      saveCachedUserRoles(roles);
      logger.info("user-roles-fetched", { count: roles.length });
      return roles;
    }
  } catch (error) {
    logger.warn("user-roles-fetch-failed", { error });
  }
  return readCachedUserRoles();
}

function buildLoginBody(payload: LoginInput): Record<string, string> {
  const username = payload.username.trim();
  const body: Record<string, string> = {
    username,
    password: payload.password
  };
  if (username.includes("@")) {
    body.email = username;
  }
  return body;
}

function extractLoginToken(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  return (
    asStringOrNull(record.token)
    ?? asStringOrNull(record.accessToken)
    ?? asStringOrNull(record.access_token)
  );
}

export async function login(payload: LoginInput, options: RequestOptions): Promise<{ token: string | null; sessionCookie: string | null; roles: string[] }> {
  return withRetry(async () => {
    const client = getClient();
    const finalUrl = `${client.defaults.baseURL}${API_ENDPOINTS.auth.login}`;
    logger.info("auth-login-request", { url: finalUrl, username: payload.username, hasCookie: Boolean(options.sessionCookie) });
    try {
      const response = await client.post(API_ENDPOINTS.auth.login, buildLoginBody(payload), {
        headers: authHeader(options)
      });
      persistCookieIfPresent(response, options);
      const parsed = loginResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.warn("auth-login-response-shape-unexpected", {
          issues: parsed.error.issues.map((issue) => issue.message).slice(0, 3)
        });
      }
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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const preview =
          typeof error.response.data === "string"
            ? error.response.data.slice(0, 220)
            : JSON.stringify(error.response.data).slice(0, 220);
        logger.warn("auth-login-response", {
          status: error.response.status,
          requestUrl: finalUrl,
          responseUrl: error.request?.responseURL,
          responsePreview: preview
        });
      }
      throw error;
    }
  });
}

export async function probeSession(options: RequestOptions): Promise<{ authenticated: boolean }> {
  try {
    await getProjects(options);
    return { authenticated: true };
  } catch (error) {
    if (error instanceof ApiError && error.kind === "auth") {
      return { authenticated: false };
    }
    throw error;
  }
}

export async function logout(options: RequestOptions): Promise<void> {
  await withRetry(async () => {
    const client = getClient();
    const response = await firstSuccess(API_ENDPOINTS.auth.logout, (path) =>
      client.post(path, {}, { headers: authHeader(options) })
    );
    persistCookieIfPresent(response, options);
  });
}

export async function testConnection(): Promise<{ reachable: boolean; message: string }> {
  try {
    const client = getClient();
    await client.post(API_ENDPOINTS.auth.login, { username: "_probe_", password: "_probe_" });
    return { reachable: true, message: "Backend reachable" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return { reachable: true, message: `Backend reachable (HTTP ${error.response.status})` };
    }
    return { reachable: false, message: "Backend is unreachable." };
  }
}

export async function getAllProjectsPaginated(options: AuthAwareRequestOptions): Promise<Project[]> {
  return withAuthRetry(async (requestOptions) => {
    const http = getClient();
    const path = "/api/projects";
    const merged = new Map<string, Project>();
    let cursor: string | null = null;
    let page = 0;

    do {
      if (page >= PROJECTS_MAX_PAGES) {
        logger.warn("projects-fetch-page-cap", { maxPages: PROJECTS_MAX_PAGES });
        break;
      }
      page += 1;
      const requestUrl = `${http.defaults.baseURL}${path}`;
      logger.info("projects-fetch-request", {
        url: requestUrl,
        page,
        cursor: cursor ?? null,
        hasCookie: Boolean(requestOptions.sessionCookie)
      });
      const response = await http.get(path, {
        headers: authHeader(requestOptions),
        params: {
          limit: 200,
          ...(cursor ? { cursor } : {})
        }
      });
      persistCookieIfPresent(response, requestOptions);
      const normalized = normalizeProjectsPayload(response.data);
      const nextCursor = parseProjectsNextCursor(response.data);
      logger.info("projects-fetch-page", {
        page,
        rawCount: normalized.length,
        accumulated: merged.size,
        nextCursor: nextCursor ?? null
      });

      for (const item of normalized) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const source = item as Record<string, unknown>;
        const mapped = mapRawProjectRecord(source);
        if (!mapped) {
          continue;
        }
        const isNonChargeable =
          typeof source.isNonChargeable === "boolean"
            ? source.isNonChargeable
            : typeof source.nonChargeable === "boolean"
              ? source.nonChargeable
              : typeof source.chargeable === "boolean"
                ? !source.chargeable
                : isNonChargeableProjectName(mapped.name);
        merged.set(mapped.id, { ...mapped, isNonChargeable });
      }

      cursor = nextCursor;
    } while (cursor);

    const parsed = finalizeProjectRows(Array.from(merged.values()));
    logger.info("projects-fetch-count", { count: parsed.length, pages: page });
    return parsed;
  }, options);
}

export async function getProjects(options: AuthAwareRequestOptions): Promise<Project[]> {
  return getAllProjectsPaginated(options);
}

function buildSessionStartBody(payload: SessionStartInput, clockStartUtc: string): Record<string, unknown> {
  const trimmedDescription = payload.description.trim();
  const workDateKey = getWorkDateKey(new Date(clockStartUtc));
  const trailingEvents: SessionLifecycleTrailingEvent[] = [
    {
      eventUuid: randomUUID(),
      eventKind: "SESSION_START",
      occurredAtIso: clockStartUtc,
      workDateKey,
      source: "DESKTOP_AGENT"
    }
  ];
  const base: Record<string, unknown> = {
    description: trimmedDescription,
    workDetails: trimmedDescription,
    work_details: trimmedDescription,
    details: trimmedDescription,
    clientTimeZone: payload.clientTimeZone,
    workDateKey,
    startTime: clockStartUtc,
    startedAt: clockStartUtc,
    startTimeUtc: clockStartUtc,
    occurredAt: clockStartUtc,
    trailingEvents
  };

  if (isCatalogProjectId(payload.projectId)) {
    const projectName = (payload.projectName ?? "").trim();
    return {
      ...base,
      projectName,
      project_name: projectName,
      isNonChargeable: true,
      nonChargeable: true
    };
  }

  return {
    ...base,
    projectId: payload.projectId.trim(),
    ...(payload.isNonChargeable
      ? { isNonChargeable: true, nonChargeable: true }
      : {})
  };
}

export async function startSession(payload: SessionStartInput, options: RequestOptions): Promise<{ sessionId: string | null }> {
  const clockStartUtc = payload.startTimeUtc ?? new Date().toISOString();
  return withRetry(async () => {
    const client = getClient();
    const trimmedDescription = payload.description.trim();
    const headers = authHeader(options);
    const sharedDescriptionFields = buildSessionStartBody(payload, clockStartUtc);
    const usesCatalogProject = isCatalogProjectId(payload.projectId);

    const sessionStartPath = API_ENDPOINTS.tracking.sessionStart;
    const sessionStartUrl = `${client.defaults.baseURL}${sessionStartPath}`;
    try {
      logger.info("tracking-session-start-request", {
        url: sessionStartUrl,
        hasCookie: Boolean(options.sessionCookie),
        clientTimeZone: payload.clientTimeZone,
        startTimeUtc: clockStartUtc,
        usesCatalogProject,
        projectName: usesCatalogProject ? payload.projectName : undefined,
        hasTrailingEvents: true
      });
      const response = await client.post(sessionStartPath, sharedDescriptionFields, { headers });
      persistCookieIfPresent(response, options);
      const responsePreview = toPreview(response.data);
      const ids = extractIds(response.data);
      let sessionId = extractWorkSessionId(response.data) ?? ids.sessionId;
      if (!shouldSendSessionId(sessionId)) {
        sessionId = await fetchActiveWorkSessionId(options);
      }
      logger.info("tracking-session-start-response", {
        path: sessionStartPath,
        status: response.status,
        hasSessionId: Boolean(sessionId),
        responsePreview
      });
      return { sessionId: shouldSendSessionId(sessionId) ? sessionId : null };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.info("tracking-session-start-fallback", {
          reason: "route_not_found_404",
          fallbackPath: API_ENDPOINTS.attendance.today[0]
        });
      } else {
        throw error;
      }
    }

    const response = await firstSuccess(API_ENDPOINTS.attendance.today, async (path) => {
      const requestUrl = `${client.defaults.baseURL}${path}`;
      logger.info("tracking-start-request", {
        url: requestUrl,
        hasCookie: Boolean(options.sessionCookie),
        hasProjectId: !usesCatalogProject && payload.projectId.trim().length > 0,
        usesCatalogProject,
        descriptionLength: trimmedDescription.length,
        clientTimeZone: payload.clientTimeZone,
        startTimeUtc: clockStartUtc
      });
      return client.post(
        path,
        {
          action: "start",
          ...sharedDescriptionFields
        },
        { headers }
      );
    });
    persistCookieIfPresent(response, options);
    const responsePreview = toPreview(response.data);
    const ids = extractIds(response.data);
    let sessionId = extractWorkSessionId(response.data) ?? ids.sessionId;
    if (!shouldSendSessionId(sessionId)) {
      sessionId = await fetchActiveWorkSessionId(options);
    }
    logger.info("tracking-start-response", {
      path: API_ENDPOINTS.attendance.today[0],
      status: response.status,
      hasSessionId: Boolean(sessionId),
      responsePreview
    });
    return { sessionId: shouldSendSessionId(sessionId) ? sessionId : null };
  });
}

export async function ingestEvent(payload: TrackingEventInput, options: AuthAwareRequestOptions): Promise<void> {
  await withAuthRetry(async (requestOptions) => {
    const client = getClient();
    const response = await firstSuccess(API_ENDPOINTS.tracking.eventsIngest, (path) =>
      client.post(path, payload, { headers: authHeader(requestOptions) })
    );
    persistCookieIfPresent(response, requestOptions);
  }, options);
}

export async function ingestEventsBatch(
  events: TrackingBatchEventInput[],
  options: AuthAwareRequestOptions
): Promise<void> {
  if (events.length === 0) {
    return;
  }
  await withAuthRetry(async (requestOptions) => {
    const client = getClient();
    const response = await client.post(
      API_ENDPOINTS.tracking.eventsBatch,
      { events },
      { headers: authHeader(requestOptions) }
    );
    persistCookieIfPresent(response, requestOptions);
    logger.info("events-batch-ingested", { count: events.length });
  }, options);
}

export function buildScreenshotMultipartBody(payload: ScreenshotIngestInput): {
  body: Buffer;
  contentType: string;
} {
  const boundary = `----landev${randomUUID()}`;
  const imageBuffer = payload.imageBytes;
  const fieldLines: string[] = [];
  const writeField = (name: string, value: string) => {
    fieldLines.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    );
  };

  writeField("capturedAt", payload.capturedAt);
  writeField("mimeType", payload.mimeType);
  if (payload.projectId) {
    writeField("projectId", payload.projectId);
  }
  if (payload.sessionId) {
    writeField("sessionId", payload.sessionId);
    writeField("workSessionId", payload.sessionId);
  }
  if (payload.metadata) {
    writeField("metadata", JSON.stringify(payload.metadata));
  }

  const ext = payload.mimeType === "image/jpeg" ? "jpg" : "png";
  const headerText =
    fieldLines.join("")
    + `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="screenshot.${ext}"\r\nContent-Type: ${payload.mimeType}\r\n\r\n`;
  const footerText = `\r\n--${boundary}--\r\n`;

  const headerBuffer = Buffer.from(headerText, "utf8");
  const footerBuffer = Buffer.from(footerText, "utf8");
  const body = Buffer.allocUnsafe(headerBuffer.length + imageBuffer.length + footerBuffer.length);
  headerBuffer.copy(body, 0);
  imageBuffer.copy(body, headerBuffer.length);
  footerBuffer.copy(body, headerBuffer.length + imageBuffer.length);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

async function ingestScreenshotMultipart(
  payload: ScreenshotIngestInput,
  options: RequestOptions
): Promise<void> {
  const client = getClient();
  const { body, contentType } = buildScreenshotMultipartBody(payload);
  const response = await firstSuccess(API_ENDPOINTS.tracking.screenshotsIngest, (path) =>
    client.post(path, body, {
      headers: {
        ...authHeader(options),
        "Content-Type": contentType,
        "Content-Length": String(body.length)
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    })
  );
  persistCookieIfPresent(response, options);
}

function screenshotRetryDelayMs(attempt: number, error: unknown): number | null {
  if (error instanceof ApiError && error.kind === "auth") {
    return attempt === 0 ? 500 : null;
  }
  const status = axios.isAxiosError(error) ? error.response?.status : null;
  if (status && status >= 400 && status < 500 && status !== 401) {
    return null;
  }
  if (!status || status >= 500 || status === 401 || status === 429) {
    return Math.min(60_000, 1000 * 2 ** attempt);
  }
  return null;
}

export async function ingestScreenshot(
  payload: ScreenshotIngestInput,
  options: AuthAwareRequestOptions
): Promise<void> {
  const maxAttempts = 4;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await withAuthRetry((requestOptions) => ingestScreenshotMultipart(payload, requestOptions), options);
      return;
    } catch (error) {
      lastError = error;
      const delayMs = screenshotRetryDelayMs(attempt, error);
      logger.warn("screenshot-upload-failed", {
        attempt: attempt + 1,
        maxAttempts,
        delayMs,
        error: error instanceof Error ? error.message : "unknown",
        status: axios.isAxiosError(error) ? error.response?.status : null
      });
      if (delayMs == null || attempt === maxAttempts - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw mapAxiosError(lastError);
}

function buildSessionStopBody(payload: SessionStopInput): Record<string, unknown> {
  const timeZone = payload.timezone ?? payload.clientTimeZone;
  const body: Record<string, unknown> = {
    stoppedAt: payload.stoppedAt,
    stopTimeUtc: payload.stoppedAt,
    endTime: payload.stoppedAt,
    occurredAt: payload.stoppedAt
  };
  if (timeZone) {
    body.clientTimeZone = timeZone;
    body.timezone = timeZone;
  }
  if (payload.deviceUuid) {
    body.deviceUuid = payload.deviceUuid;
  }
  if (payload.workDateKey) {
    body.workDateKey = payload.workDateKey;
  }
  if (payload.trailingEvents && payload.trailingEvents.length > 0) {
    body.trailingEvents = payload.trailingEvents;
  }
  if (payload.stopReason) {
    body.stopReason = payload.stopReason;
  }
  if (payload.startedAt) {
    body.startedAt = payload.startedAt;
    body.startTimeUtc = payload.startedAt;
    body.startTime = payload.startedAt;
  }
  if (typeof payload.durationMs === "number" && payload.durationMs > 0) {
    body.durationMs = payload.durationMs;
    body.trackedDurationMs = payload.durationMs;
    body.durationSeconds = Math.round(payload.durationMs / 1000);
  }
  if (payload.sessionSegmentStartedAt) {
    body.sessionSegmentStartedAt = payload.sessionSegmentStartedAt;
  }
  if (payload.projectId) {
    body.projectId = payload.projectId;
  }
  if (shouldSendSessionId(payload.sessionId)) {
    body.sessionId = payload.sessionId;
    body.workSessionId = payload.sessionId;
  }
  return body;
}

function idempotentStopResult(
  endpointPath: string,
  payload: SessionStopInput,
  responsePreview: string | null,
  status: number | null
): SessionStopResult {
  return {
    ok: true,
    queued: false,
    endpointPath,
    status,
    confirmedBy: "idempotent",
    sessionId: shouldSendSessionId(payload.sessionId) ? payload.sessionId ?? null : null,
    timesheetId: null,
    responsePreview
  };
}

async function postAttendanceStop(
  payload: SessionStopInput,
  options: RequestOptions
): Promise<SessionStopResult> {
  const client = getClient();
  const headers = authHeader(options);
  const endpointPath = API_ENDPOINTS.attendance.today[0];
  const requestUrl = `${client.defaults.baseURL}${endpointPath}`;
  const body: Record<string, unknown> = {
    action: "end",
    ...buildSessionStopBody(payload)
  };
  logger.info("tracking-stop-request", {
    url: requestUrl,
    hasCookie: Boolean(options.sessionCookie),
    hasSessionId: shouldSendSessionId(payload.sessionId),
    payloadKeys: Object.keys(body),
    hasClientTimeZone: Boolean(payload.clientTimeZone)
  });
  const response = await client.post(endpointPath, body, { headers });
  const responsePreview = toPreview(response.data);
  logger.info("tracking-stop-response", {
    path: endpointPath,
    status: response.status,
    ok: true,
    responsePreview
  });
  persistCookieIfPresent(response, options);
  const ids = extractIds(response.data);
  return {
    ok: true,
    queued: false,
    endpointPath,
    status: response.status,
    confirmedBy: "attendance",
    sessionId: ids.sessionId,
    timesheetId: ids.timesheetId,
    responsePreview
  };
}

export async function stopSession(
  payload: SessionStopInput,
  options: AuthAwareRequestOptions
): Promise<SessionStopResult> {
  return withAuthRetry(async (requestOptions) => {
    const client = getClient();
    const headers = authHeader(requestOptions);
    const stopBody = buildSessionStopBody(payload);
    const sessionStopPath = API_ENDPOINTS.tracking.sessionStop;
    const sessionStopUrl = `${client.defaults.baseURL}${sessionStopPath}`;

    try {
      logger.info("tracking-session-stop-request", {
        url: sessionStopUrl,
        hasCookie: Boolean(requestOptions.sessionCookie),
        hasSessionId: shouldSendSessionId(payload.sessionId),
        clientTimeZone: payload.clientTimeZone ?? payload.timezone,
        hasTrailingEvents: Boolean(payload.trailingEvents?.length),
        deviceUuid: payload.deviceUuid ?? null
      });
      const response = await client.post(sessionStopPath, stopBody, { headers });
      persistCookieIfPresent(response, requestOptions);
      const responsePreview = toPreview(response.data);
      const ids = extractIds(response.data);
      logger.info("tracking-session-stop-response", {
        path: sessionStopPath,
        status: response.status,
        hasSessionId: Boolean(ids.sessionId),
        responsePreview
      });
      return {
        ok: true,
        queued: false,
        endpointPath: sessionStopPath,
        status: response.status,
        confirmedBy: "tracking",
        sessionId: ids.sessionId ?? (shouldSendSessionId(payload.sessionId) ? payload.sessionId ?? null : null),
        timesheetId: ids.timesheetId,
        responsePreview
      };
    } catch (error) {
      if (isAlreadyStoppedError(error)) {
        const response = axios.isAxiosError(error) ? error.response : undefined;
        return idempotentStopResult(
          sessionStopPath,
          payload,
          toPreview(response?.data),
          response?.status ?? null
        );
      }

      if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
        const response = axios.isAxiosError(error) ? error.response : undefined;
        logger.warn("tracking-session-stop-response", {
          path: sessionStopPath,
          status: response?.status ?? null,
          ok: false,
          responsePreview: toPreview(response?.data)
        });
        throw error;
      }

      logger.info("tracking-session-stop-fallback", {
        reason: "route_not_found_404",
        fallbackPath: API_ENDPOINTS.attendance.today[0]
      });
    }

    try {
      return await postAttendanceStop(payload, requestOptions);
    } catch (error) {
      if (isAlreadyStoppedError(error)) {
        const response = axios.isAxiosError(error) ? error.response : undefined;
        return idempotentStopResult(
          API_ENDPOINTS.attendance.today[0],
          payload,
          toPreview(response?.data),
          response?.status ?? null
        );
      }
      throw error;
    }
  }, options);
}

export type WebNotificationsStatus = {
  unreadCount: number;
};

function parseUnreadNotificationCount(payload: unknown): number {
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return Math.max(0, Math.floor(payload));
  }
  if (typeof payload === "string") {
    const parsed = Number(payload.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
    return 0;
  }
  if (!payload || typeof payload !== "object") {
    return 0;
  }
  const record = payload as Record<string, unknown>;
  for (const key of [
    "unreadCount",
    "unread",
    "count",
    "total",
    "unreadTotal",
    "unread_count",
    "unreadNotifications"
  ]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.floor(parsed));
      }
    }
  }
  for (const key of ["data", "result", "payload"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      const nestedCount = parseUnreadNotificationCount(nested);
      if (nestedCount > 0) {
        return nestedCount;
      }
    }
  }
  if (Array.isArray(record.notifications)) {
    return record.notifications.filter((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const row = item as Record<string, unknown>;
      return row.read !== true && row.isRead !== true && row.seen !== true && row.readAt == null;
    }).length;
  }
  if (Array.isArray(record.items)) {
    return parseUnreadNotificationCount({ notifications: record.items });
  }
  return 0;
}

function isHtmlResponse(data: unknown): boolean {
  return typeof data === "string" && data.trimStart().startsWith("<!DOCTYPE html");
}

/** Remote web inbox unread count only (desktop local alerts merged in main process). */
export async function fetchWebNotificationRemoteCount(
  options: AuthAwareRequestOptions
): Promise<number> {
  if (!options.token && !options.sessionCookie) {
    return 0;
  }

  try {
    return await withAuthRetry(async (requestOptions) => {
      const client = getClient();
      const response = await firstSuccess(API_ENDPOINTS.notifications.unreadCount, (path) =>
        client.get(path, { headers: authHeader(requestOptions) })
      );
      persistCookieIfPresent(response, requestOptions);
      if (isHtmlResponse(response.data)) {
        throw new ApiError("validation", "notifications_endpoint_returned_html");
      }
      const count = parseUnreadNotificationCount(response.data);
      logger.info("web-notifications-remote-count", { count, path: response.config.url ?? null });
      return count;
    }, options);
  } catch (error) {
    logger.warn("web-notifications-unread-fetch-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return 0;
  }
}

/** @deprecated Use fetchWebNotificationRemoteCount + notification-badge merge. */
export async function fetchWebNotificationsStatus(
  options: AuthAwareRequestOptions
): Promise<WebNotificationsStatus> {
  const unreadCount = await fetchWebNotificationRemoteCount(options);
  return { unreadCount };
}
