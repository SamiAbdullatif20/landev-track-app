import * as api from "../api/client";
import { logger } from "../config/logger";
import { readCredentials } from "../security/credential-store";
import {
  clearSessionCookie,
  clearToken,
  readSessionCookie,
  readToken,
  saveSessionCookie,
  saveToken
} from "../security/token-store";

export type AuthContext = {
  token?: string;
  sessionCookie?: string;
  onSessionCookie: (cookie: string) => void;
};

export function readAuthContext(): AuthContext {
  return {
    token: readToken() ?? undefined,
    sessionCookie: readSessionCookie() ?? undefined,
    onSessionCookie: saveSessionCookie
  };
}

export function isAuthenticated(): boolean {
  return Boolean(readToken() || readSessionCookie());
}

/** Re-login with saved credentials after 401; returns refreshed auth options or null. */
export async function refreshAuthSession(): Promise<AuthContext | null> {
  const saved = readCredentials();
  if (!saved) {
    logger.warn("auth-refresh-skipped", { reason: "no_saved_credentials" });
    return null;
  }

  try {
    logger.info("auth-refresh-attempt", { username: saved.username });
    const result = await api.login(
      { username: saved.username, password: saved.password },
      readAuthContext()
    );
    if (result.token) {
      saveToken(result.token);
    }
    if (result.sessionCookie) {
      saveSessionCookie(result.sessionCookie);
    }
    logger.info("auth-refresh-success", { hasToken: Boolean(result.token), hasCookie: Boolean(result.sessionCookie) });
    return readAuthContext();
  } catch (error) {
    logger.warn("auth-refresh-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    clearToken();
    clearSessionCookie();
    return null;
  }
}
