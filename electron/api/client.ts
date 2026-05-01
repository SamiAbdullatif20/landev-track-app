import axios, { AxiosError, type AxiosResponse } from "axios";
import { z } from "zod";
import { readEnv } from "../config/env";
import { API_ENDPOINTS } from "./endpoints";
import { logger } from "../config/logger";

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
  projectNumber: string | null;
  clientName: string | null;
};

export type SessionStartInput = {
  projectId: string;
  description: string;
};

export type TrackingEventInput = {
  sessionId?: string;
  type: string;
  occurredAt: string;
  eventUuid?: string;
  eventKind?: string;
  metadata?: Record<string, unknown>;
};

export type SessionStopInput = {
  sessionId?: string | null;
  stoppedAt: string;
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

  constructor(kind: "network" | "auth" | "server" | "validation", message: string) {
    super(message);
    this.kind = kind;
  }
}

type RequestOptions = {
  token?: string;
  sessionCookie?: string;
  onSessionCookie?: (cookie: string) => void;
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

const loginResponseSchema = z.object({
  token: z.string().optional()
});
const projectSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  name: z
    .union([z.string(), z.number()])
    .transform((value) => String(value)),
  projectNumber: z.string().nullable(),
  clientName: z.string().nullable()
});
const projectsResponseSchema = z.array(projectSchema);
const startResponseSchema = z.object({ sessionId: z.string().min(1).nullable().optional() });

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

function mapAxiosError(error: unknown): ApiError {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    return new ApiError(
      "validation",
      firstIssue?.message ?? "Response validation failed for backend payload."
    );
  }

  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return new ApiError("validation", error.message);
    }
    return new ApiError("server", "Unexpected error while talking to server.");
  }

  const axiosError = error as AxiosError<{ message?: string; error?: string; errors?: string[] }>;
  if (!axiosError.response) {
    return new ApiError("network", "Network unavailable. Check your connection and retry.");
  }

  if (axiosError.response.status === 401 || axiosError.response.status === 403) {
    return new ApiError("auth", "Session expired or unauthorized. Please log in again.");
  }

  if (axiosError.response.status >= 500) {
    return new ApiError("server", "Server is currently unavailable. Try again shortly.");
  }

  const details =
    axiosError.response.data?.message
    ?? axiosError.response.data?.error
    ?? axiosError.response.data?.errors?.[0]
    ?? `Request failed with status ${axiosError.response.status}.`;
  return new ApiError("validation", details);
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
      await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
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

function isAlreadyStoppedError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) {
    return false;
  }
  if (error.response.status !== 409 && error.response.status !== 400) {
    return false;
  }
  const message =
    typeof error.response.data === "string"
      ? error.response.data
      : JSON.stringify(error.response.data ?? {});
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
  const timesheetObj = record.timesheet && typeof record.timesheet === "object"
    ? (record.timesheet as Record<string, unknown>)
    : null;
  const sessionId = asStringOrNull(
    record.sessionId
    ?? record.session_id
    ?? record.id
    ?? record.trackingSessionId
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

export async function login(payload: LoginInput, options: RequestOptions): Promise<{ token: string | null; sessionCookie: string | null }> {
  return withRetry(async () => {
    const client = getClient();
    const finalUrl = `${client.defaults.baseURL}${API_ENDPOINTS.auth.login}`;
    logger.info("auth-login-request", { url: finalUrl, username: payload.username, hasCookie: Boolean(options.sessionCookie) });
    try {
      const response = await client.post(API_ENDPOINTS.auth.login, {
        username: payload.username,
        password: payload.password
      }, { headers: authHeader(options) });
      persistCookieIfPresent(response, options);
      const parsed = loginResponseSchema.parse(response.data);
      const sessionCookie = extractCookieHeader(response.headers["set-cookie"] as string[] | undefined);
      return { token: parsed.token ?? null, sessionCookie };
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

export async function getProjects(options: RequestOptions): Promise<Project[]> {
  return withRetry(async () => {
    const client = getClient();
    const response = await firstSuccess(API_ENDPOINTS.tracking.projects, async (path) => {
      const requestUrl = `${client.defaults.baseURL}${path}`;
      logger.info("projects-fetch-request", { url: requestUrl, hasCookie: Boolean(options.sessionCookie) });
      const result = await client.get(path, { headers: authHeader(options) });
      logger.info("projects-fetch-response", {
        path,
        status: result.status
      });
      persistCookieIfPresent(result, options);
      return result;
    });

    const normalized = normalizeProjectsPayload(response.data);
    logger.info("projects-fetch-raw-count", { count: normalized.length });

    const items = normalized.map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const source = item as Record<string, unknown>;
      const id = asStringOrNull(source.id ?? source.projectId ?? source.project_id ?? source._id);
      const name = asStringOrNull(source.name ?? source.title ?? source.projectName ?? source.project_name);
      if (id == null || name == null) {
        return null;
      }
      const projectNumberRaw = source.projectNumber ?? source.project_number ?? source.code ?? null;
      const clientRaw = source.clientName ?? source.client_name ?? source.client ?? null;
      const clientName =
        clientRaw && typeof clientRaw === "object"
          ? (clientRaw as Record<string, unknown>).name
            ?? (clientRaw as Record<string, unknown>).title
            ?? (clientRaw as Record<string, unknown>).companyName
            ?? null
          : clientRaw;
      return {
        id,
        name,
        projectNumber: asStringOrNull(projectNumberRaw),
        clientName: asStringOrNull(clientName)
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const parsed = projectsResponseSchema.parse(items);
    logger.info("projects-fetch-count", { count: parsed.length });
    return parsed;
  });
}

export async function startSession(payload: SessionStartInput, options: RequestOptions): Promise<{ sessionId: string | null }> {
  return withRetry(async () => {
    const client = getClient();
    const trimmedDescription = payload.description.trim();
    const response = await firstSuccess(API_ENDPOINTS.attendance.today, async (path) => {
      const requestUrl = `${client.defaults.baseURL}${path}`;
      logger.info("tracking-start-request", {
        url: requestUrl,
        hasCookie: Boolean(options.sessionCookie),
        hasProjectId: payload.projectId.trim().length > 0,
        descriptionLength: trimmedDescription.length
      });
      return client.post(
        path,
        {
          action: "start",
          projectId: payload.projectId.trim(),
          description: trimmedDescription,
          workDetails: trimmedDescription,
          work_details: trimmedDescription,
          details: trimmedDescription
        },
        { headers: authHeader(options) }
      );
    });
    persistCookieIfPresent(response, options);
    const responsePreview = toPreview(response.data);
    const parsed = startResponseSchema.safeParse(response.data);
    const ids = extractIds(response.data);
    const sessionId = parsed.success ? parsed.data.sessionId ?? ids.sessionId : ids.sessionId;
    logger.info("tracking-start-response", {
      path: API_ENDPOINTS.attendance.today[0],
      status: response.status,
      hasSessionId: Boolean(sessionId),
      responsePreview
    });
    return { sessionId };
  });
}

export async function ingestEvent(payload: TrackingEventInput, options: RequestOptions): Promise<void> {
  await withRetry(async () => {
    const client = getClient();
    const response = await firstSuccess(API_ENDPOINTS.tracking.eventsIngest, (path) =>
      client.post(path, payload, { headers: authHeader(options) })
    );
    persistCookieIfPresent(response, options);
  });
}

export async function stopSession(payload: SessionStopInput, options: RequestOptions): Promise<SessionStopResult> {
  return withRetry(async () => {
    const client = getClient();
    const headers = authHeader(options);
    const endpointPath = API_ENDPOINTS.attendance.today[0];
    const requestUrl = `${client.defaults.baseURL}${endpointPath}`;
    const body = { action: "end", stoppedAt: payload.stoppedAt };
    logger.info("tracking-stop-request", {
      url: requestUrl,
      hasCookie: Boolean(options.sessionCookie),
      hasSessionId: false,
      payloadKeys: Object.keys(body)
    });
    try {
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
    } catch (error) {
      if (isAlreadyStoppedError(error)) {
        const response = axios.isAxiosError(error) ? error.response : undefined;
        const responsePreview = toPreview(response?.data);
        logger.info("tracking-stop-response", {
          path: endpointPath,
          status: response?.status ?? null,
          ok: true,
          idempotent: true,
          responsePreview
        });
        return {
          ok: true,
          queued: false,
          endpointPath,
          status: response?.status ?? null,
          confirmedBy: "idempotent",
          sessionId: shouldSendSessionId(payload.sessionId) ? payload.sessionId ?? null : null,
          timesheetId: null,
          responsePreview
        };
      }
      const response = axios.isAxiosError(error) ? error.response : undefined;
      logger.warn("tracking-stop-response", {
        path: endpointPath,
        status: response?.status ?? null,
        ok: false,
        responsePreview: toPreview(response?.data)
      });
      throw error;
    }
  });
}
