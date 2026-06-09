import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import {
  getPendingCount,
  getPendingEventsByKinds,
  markEventForRetry,
  markEventsDelivered
} from "../db/queue-repo";
import { refreshAuthSession, readAuthContext } from "./auth-session";
import { notifyDesktop } from "./desktop-notifications";

const SYNC_FAILURE_NOTIFY_COOLDOWN_MS = 5 * 60_000;
let lastSyncFailureNotifyMs = 0;

export type SyncStatus = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  lastSyncAt: string | null;
};

/** Batch flush interval (30–60s target). */
export const EVENT_BATCH_SYNC_INTERVAL_MS = 45_000;

const BATCH_SIZE = 100;

type SyncWorkerOptions = {
  window: BrowserWindow;
  onSyncResult?: (result: { ok: boolean; statusCode: number | null; message: string }) => void;
};

export class SyncWorker {
  private readonly window: BrowserWindow;
  private readonly onSyncResult?: SyncWorkerOptions["onSyncResult"];
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
    }, EVENT_BATCH_SYNC_INTERVAL_MS);
    logger.info("event-batch-sync-started", { intervalMs: EVENT_BATCH_SYNC_INTERVAL_MS });
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info("event-batch-sync-stopped");
    }
  }

  public getStatus(): SyncStatus {
    return { ...this.status, pendingCount: getPendingCount() };
  }

  public async flush(): Promise<SyncStatus> {
    if (this.syncInProgress) {
      return this.getStatus();
    }

    const ctx = readAuthContext();
    if (!ctx.token && !ctx.sessionCookie) {
      this.status.pendingCount = getPendingCount();
      this.publishStatus();
      return this.getStatus();
    }

    this.syncInProgress = true;
    this.status.syncing = true;
    this.publishStatus();

    try {
      const events = getPendingEventsByKinds(api.BATCH_TRACKING_EVENT_KINDS, BATCH_SIZE);
      if (events.length === 0) {
        this.status.pendingCount = getPendingCount();
        return this.getStatus();
      }

      const batchPayload: api.TrackingBatchEventInput[] = [];
      const deliveredIds: number[] = [];
      let nextRetryAt: string | null = null;

      for (const event of events) {
        const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
        batchPayload.push({
          ...(payload as api.TrackingEventInput),
          eventUuid: event.eventUuid,
          eventKind: event.eventKind,
          type: (payload.type as string | undefined) ?? event.eventKind
        });
        deliveredIds.push(event.id);
      }

      try {
        logger.info("sync-batch-attempt", {
          count: batchPayload.length,
          kinds: Array.from(new Set(events.map((event) => event.eventKind)))
        });
        await api.ingestEventsBatch(batchPayload, {
          ...ctx,
          onAuthRefresh: refreshAuthSession
        });
        markEventsDelivered(deliveredIds);
        logger.info("sync-batch-delivered", { count: deliveredIds.length });
        this.onSyncResult?.({ ok: true, statusCode: 200, message: "batch_delivered" });
        this.status.online = true;
        this.status.lastError = null;
        this.status.lastSyncAt = new Date().toISOString();
      } catch (error) {
        logger.warn("sync-batch-failed", {
          count: batchPayload.length,
          error: error instanceof Error ? error.message : "unknown"
        });
        this.onSyncResult?.({
          ok: false,
          statusCode: error instanceof api.ApiError && error.kind === "validation" ? 400 : null,
          message: error instanceof Error ? error.message : "sync_failed"
        });
        for (const event of events) {
          const scheduled = markEventForRetry(event.id, event.attempts + 1);
          nextRetryAt = nextRetryAt ?? scheduled;
        }
        if (error instanceof api.ApiError && error.kind === "network") {
          this.status.online = false;
          this.status.lastError = "offline";
        } else {
          this.status.lastError = error instanceof Error ? error.message : "sync_failed";
        }
        this.maybeNotifySyncFailure(events.length);
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

  private maybeNotifySyncFailure(failedBatchSize: number): void {
    const pending = getPendingCount();
    if (pending <= 0 && failedBatchSize <= 0) {
      return;
    }
    const nowMs = Date.now();
    if (nowMs - lastSyncFailureNotifyMs < SYNC_FAILURE_NOTIFY_COOLDOWN_MS) {
      return;
    }
    lastSyncFailureNotifyMs = nowMs;
    void notifyDesktop({
      event: "sync_failure",
      title: "LANDEV — sync issue",
      body:
        this.status.lastError === "offline"
          ? `Tracking data is queued offline (${pending} item${pending === 1 ? "" : "s"} pending).`
          : `Could not upload tracking data (${pending} pending). Will retry automatically.`
    });
  }

  private publishStatus(): void {
    this.window.webContents.send("tracking:sync-status-push", this.getStatus());
  }
}
