import { session } from "electron";
import { readEnv } from "../config/env";
import { logger } from "../config/logger";

function apiBaseUrls(): string[] {
  const normalized = readEnv()
    .VITE_API_BASE_URL.replace(/\/+$/, "")
    .replace(/\/api$/, "");
  return [normalized, `${normalized}/api`];
}

/** Remove HTTP cookies Electron kept for the API origin (withCredentials jar). */
export async function clearApiSessionCookies(): Promise<void> {
  let removed = 0;
  for (const url of apiBaseUrls()) {
    try {
      const cookies = await session.defaultSession.cookies.get({ url });
      for (const cookie of cookies) {
        await session.defaultSession.cookies.remove(url, cookie.name);
        removed += 1;
      }
    } catch (error) {
      logger.warn("api-session-cookie-clear-failed", {
        url,
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  }
  if (removed > 0) {
    logger.info("api-session-cookies-cleared", { count: removed });
  }
}
