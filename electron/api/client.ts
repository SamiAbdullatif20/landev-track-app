import axios, { AxiosError } from "axios";
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
};

export type SessionStartInput = {
  projectId: string;
  description: string;
};

export type TrackingEventInput = {
  sessionId: string;
  type: string;
  occurredAt: string;
  eventUuid?: string;
  eventKind?: string;
  metadata?: Record<string, unknown>;
};

export type SessionStopInput = {
  sessionId: string;
  stoppedAt: string;
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
const meResponseSchema = z.object({
  id: z.string().optional().default("unknown"),
  username: z.string().optional().default("user"),
  roles: z.array(z.string()).optional().default([])
});
const projectSchema = z.object({ id: z.string(), name: z.string() });
const projectsResponseSchema = z.array(projectSchema);
const startResponseSchema = z.object({ sessionId: z.string().min(1) });

function mapAxiosError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError("server", "Unexpected error while talking to server.");
  }

  const axiosError = error as AxiosError<{ message?: string; error?: string; errors?: string[] }>;
  if (!axiosError.response) {
    return new ApiError("network", "Network unavailable. Check your connection and retry.");
  }

  if (axiosError.response.status === 401 || axiosError.response.status === 403) {
    return new ApiError("auth", "Authentication failed. Please log in again.");
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

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export async function login(payload: LoginInput): Promise<{ token: string | null }> {
  return withRetry(async () => {
    const client = getClient();
    const finalUrl = `${client.defaults.baseURL}${API_ENDPOINTS.auth.login}`;
    logger.info("auth-login-request", { url: finalUrl, username: payload.username });
    try {
      const response = await client.post(API_ENDPOINTS.auth.login, {
        username: payload.username,
        password: payload.password
      });
      const parsed = loginResponseSchema.parse(response.data);
      return { token: parsed.token ?? null };
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

export async function me(options: RequestOptions): Promise<MeResponse> {
  return withRetry(async () => {
    const client = getClient();
    const response = await firstSuccess(API_ENDPOINTS.auth.me, (path) =>
      client.get(path, { headers: authHeader(options.token) })
    );
    return meResponseSchema.parse(response.data);
  });
}

export async function logout(options: RequestOptions): Promise<void> {
  await withRetry(async () => {
    const client = getClient();
    await firstSuccess(API_ENDPOINTS.auth.logout, (path) =>
      client.post(path, {}, { headers: authHeader(options.token) })
    );
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
    const response = await firstSuccess(API_ENDPOINTS.tracking.projects, (path) =>
      client.get(path, { headers: authHeader(options.token) })
    );
    return projectsResponseSchema.parse(response.data);
  });
}

export async function startSession(payload: SessionStartInput, options: RequestOptions): Promise<{ sessionId: string }> {
  return withRetry(async () => {
    const client = getClient();
    const response = await firstSuccess(API_ENDPOINTS.attendance.today, (path) =>
      client.post(path, { action: "start", ...payload }, { headers: authHeader(options.token) })
    );
    const parsed = startResponseSchema.safeParse(response.data);
    if (parsed.success) {
      return parsed.data;
    }
    return { sessionId: `${Date.now()}` };
  });
}

export async function ingestEvent(payload: TrackingEventInput, options: RequestOptions): Promise<void> {
  await withRetry(async () => {
    const client = getClient();
    await firstSuccess(API_ENDPOINTS.tracking.eventsIngest, (path) =>
      client.post(path, payload, { headers: authHeader(options.token) })
    );
  });
}

export async function stopSession(payload: SessionStopInput, options: RequestOptions): Promise<void> {
  await withRetry(async () => {
    const client = getClient();
    await firstSuccess(API_ENDPOINTS.tracking.sessionStop, (path) =>
      client.post(path, payload, { headers: authHeader(options.token) })
    );
    await firstSuccess(API_ENDPOINTS.attendance.today, (path) =>
      client.post(path, { action: "stop", stoppedAt: payload.stoppedAt }, { headers: authHeader(options.token) })
    );
  });
}
