import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import { getPendingCount, getPendingEvents, markEventDelivered, markEventForRetry } from "../db/queue-repo";

export type SyncStatus = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  lastSyncAt: string | null;
};

type SyncWorkerOptions = {
  readToken: () => string | null;
  readSessionCookie: () => string | null;
  window: BrowserWindow;
  onSyncResult?: (result: { ok: boolean; statusCode: number | null; message: string }) => void;
};

export class SyncWorker {
  private readonly readToken: () => string | null;
  private readonly readSessionCookie: () => string | null;
  private readonly window: BrowserWindow;
  private readonly onSyncResult?: (result: { ok: boolean; statusCode: number | null; message: string }) => void;
  private interval: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private status: SyncStatus = {
    online: true,
    syncing: false,
    pendingCount: 0,
    nextRetryAt: null,
    lastError: null,
    lastSyncAt: null
  };

  constructor(options: SyncWorkerOptions) {
    this.readToken = options.readToken;
    this.readSessionCookie = options.readSessionCookie;
    this.window = options.window;
    this.onSyncResult = options.onSyncResult;
    this.status.pendingCount = getPendingCount();
  }

  public start(): void {
    if (this.interval) {
      return;
    }
    this.publishStatus();
    this.interval = setInterval(() => {
      this.flush().catch((error) => {
        logger.error("sync-worker-interval-failed", { error });
      });
    }, 10_000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  public getStatus(): SyncStatus {
    return { ...this.status, pendingCount: getPendingCount() };
  }

  public async flush(): Promise<SyncStatus> {
    if (this.syncInProgress) {
      return this.getStatus();
    }

    const token = this.readToken() ?? undefined;
    const sessionCookie = this.readSessionCookie() ?? undefined;
    if (!token && !sessionCookie) {
      this.status.pendingCount = getPendingCount();
      this.publishStatus();
      return this.getStatus();
    }

    this.syncInProgress = true;
    this.status.syncing = true;
    this.publishStatus();

    try {
      const events = getPendingEvents(100);
      let nextRetryAt: string | null = null;

      for (const event of events) {
        try {
          const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
          logger.info("sync-event-attempt", {
            eventId: event.id,
            eventKind: event.eventKind,
            hasSessionId: Boolean((payload as { sessionId?: unknown }).sessionId)
          });
          await api.ingestEvent(
            {
              ...payload,
              eventUuid: event.eventUuid,
              eventKind: event.eventKind
            } as api.TrackingEventInput,
            { token, sessionCookie }
          );
          markEventDelivered(event.id);
          logger.info("sync-event-delivered", { eventId: event.id, eventKind: event.eventKind });
          this.onSyncResult?.({ ok: true, statusCode: 200, message: "delivered" });
          this.status.online = true;
          this.status.lastError = null;
          this.status.lastSyncAt = new Date().toISOString();
        } catch (error) {
          logger.warn("sync-event-failed", {
            eventId: event.id,
            eventKind: event.eventKind,
            error: error instanceof Error ? error.message : "unknown"
          });
          this.onSyncResult?.({
            ok: false,
            statusCode: error instanceof api.ApiError && error.kind === "validation" ? 400 : null,
            message: error instanceof Error ? error.message : "sync_failed"
          });
          const scheduled = markEventForRetry(event.id, event.attempts + 1);
          nextRetryAt = nextRetryAt ?? scheduled;
          if (error instanceof api.ApiError && error.kind === "network") {
            this.status.online = false;
            this.status.lastError = "offline";
          } else {
            this.status.lastError = error instanceof Error ? error.message : "sync_failed";
          }
        }
      }

      this.status.nextRetryAt = nextRetryAt;
      this.status.pendingCount = getPendingCount();
      return this.getStatus();
    } finally {
      this.syncInProgress = false;
      this.status.syncing = false;
      this.status.pendingCount = getPendingCount();
      this.publishStatus();
    }
  }

  private publishStatus(): void {
    this.window.webContents.send("tracking:sync-status-push", this.getStatus());
  }
}
