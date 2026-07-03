import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import { readAuthContext, refreshAuthSession } from "./auth-session";
import type { RemoteSessionStatus } from "./session-remote-status";

/**
 * Poll web session state so desktop mirrors a web Start and backfills the
 * server session id. Kept infrequent: most teams start/stop from the desktop,
 * so this is only a low-cost fallback (also reduces Vercel function calls).
 */
export const SESSION_REMOTE_SYNC_INTERVAL_MS = 300_000;
/** Ignore remote mirror actions briefly after a local Start/Stop click. */
export const LOCAL_ACTION_GRACE_MS = 60_000;

export type SessionRemoteSyncCallbacks = {
  getLocalState: () => {
    active: boolean;
    sessionId: string | null;
    startedAt: string | null;
  };
  mirrorStart: (remote: RemoteSessionStatus) => Promise<void>;
  updateSessionId: (sessionId: string) => void;
  notifyStatus: () => void;
};

export class SessionRemoteSyncService {
  private interval: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private localActionGraceUntilMs = 0;
  private readonly window: BrowserWindow;

  constructor(
    window: BrowserWindow,
    private readonly callbacks: SessionRemoteSyncCallbacks
  ) {
    this.window = window;
  }

  start(): void {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(() => {
      void this.syncNow();
    }, SESSION_REMOTE_SYNC_INTERVAL_MS);
    logger.info("session-remote-sync-started", { intervalMs: SESSION_REMOTE_SYNC_INTERVAL_MS });
    void this.syncNow();
  }

  stop(): void {
    if (!this.interval) {
      return;
    }
    clearInterval(this.interval);
    this.interval = null;
    logger.info("session-remote-sync-stopped");
  }

  /** Call when the user starts/stops from the desktop UI (not a mirror). */
  markLocalUserAction(graceMs: number = LOCAL_ACTION_GRACE_MS): void {
    this.localActionGraceUntilMs = Date.now() + graceMs;
  }

  async syncNow(): Promise<void> {
    if (this.syncInProgress || this.window.isDestroyed()) {
      return;
    }

    const ctx = readAuthContext();
    if (!ctx.token && !ctx.sessionCookie) {
      return;
    }

    this.syncInProgress = true;
    try {
      const remote = await api.fetchRemoteSessionStatus({
        ...ctx,
        onAuthRefresh: refreshAuthSession
      });
      if (!remote) {
        return;
      }

      const local = this.callbacks.getLocalState();
      const inGrace = Date.now() < this.localActionGraceUntilMs;

      if (local.active && remote.active) {
        if (remote.sessionId && (!local.sessionId || local.sessionId !== remote.sessionId)) {
          this.callbacks.updateSessionId(remote.sessionId);
          this.callbacks.notifyStatus();
        }
        return;
      }

      if (inGrace) {
        return;
      }

      if (!local.active && remote.active) {
        logger.info("session-remote-sync-mirror-start", {
          sessionId: remote.sessionId,
          projectId: remote.projectId,
          projectName: remote.projectName
        });
        await this.callbacks.mirrorStart(remote);
        this.callbacks.notifyStatus();
        return;
      }

      // Intentionally never mirror a remote "stop". A running local session may
      // only be ended by the user's Stop button or by the app closing. Remote
      // status endpoints can transiently report inactive, which previously
      // caused sessions to stop unexpectedly.
    } catch (error) {
      logger.warn("session-remote-sync-failed", { error });
    } finally {
      this.syncInProgress = false;
    }
  }
}
