import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import { readAuthContext, refreshAuthSession } from "./auth-session";
import type { RemoteSessionStatus } from "./session-remote-status";

/** Poll web session state so desktop mirrors web Start/Stop. */
export const SESSION_REMOTE_SYNC_INTERVAL_MS = 5_000;
const LOCAL_ACTION_GRACE_MS = 12_000;

export type SessionRemoteSyncCallbacks = {
  getLocalState: () => {
    active: boolean;
    sessionId: string | null;
    startedAt: string | null;
  };
  mirrorStart: (remote: RemoteSessionStatus) => Promise<void>;
  mirrorStop: (stoppedAt: string) => Promise<void>;
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
  markLocalUserAction(): void {
    this.localActionGraceUntilMs = Date.now() + LOCAL_ACTION_GRACE_MS;
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

      if (local.active && remote.active && remote.sessionId) {
        if (!local.sessionId || local.sessionId !== remote.sessionId) {
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

      if (local.active && !remote.active) {
        logger.info("session-remote-sync-mirror-stop", {
          sessionId: local.sessionId
        });
        await this.callbacks.mirrorStop(new Date().toISOString());
        this.callbacks.notifyStatus();
      }
    } catch (error) {
      logger.warn("session-remote-sync-failed", { error });
    } finally {
      this.syncInProgress = false;
    }
  }
}
