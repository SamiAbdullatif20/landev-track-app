import { session } from "electron";
import { logger } from "../config/logger";

/** Best-effort RAM release after heavy work (screenshots). */
export async function trimWorkingSetAfterHeavyWork(): Promise<void> {
  try {
    await session.defaultSession.clearCache();
  } catch (error) {
    logger.debug("memory-trim-cache-clear-failed", { error });
  }

  const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  if (typeof gc === "function") {
    try {
      gc();
    } catch {
      // Optional when --expose-gc is set.
    }
  }
}
