import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import type { QueuedEvent } from "../db/index";
import {
  getPendingCount,
  getPendingEventsByKinds,
  markEventDelivered,
  markEventForRetry,
  markEventsDelivered
} from "../db/queue-repo";
import { refreshAuthSession, readAuthContext } from "./auth-session";
import { buildBatchPayloadFromQueuedEvent } from "./batch-event-payload";
import { notifyDesktop } from "./desktop-notifications";

const SYNC_FAILURE_NOTIFY_COOLDOWN_MS = 5 * 60_000;
/** After this many failed uploads, drop the event so the rest of the queue can drain. */
export const MAX_SYNC_ATTEMPTS = 12;

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

type PreparedQueuedEvent = {
  event: QueuedEvent;
  payload: api.TrackingBatchEventInput;
};

function parseQueuedBatchEvent(event: QueuedEvent): PreparedQueuedEvent {
  const payloadJson = JSON.parse(event.payloadJson) as Record<string, unknown>;
  return {
    event,
    payload: buildBatchPayloadFromQueuedEvent(payloadJson, event.eventUuid, event.eventKind)
  };
}

function logSyncApiError(scope: string, error: unknown, extra: Record<string, unknown> = {}): void {
  const details =
    error instanceof api.ApiError
      ? {
          error: error.message,
          kind: error.kind,
          statusCode: error.statusCode ?? null,
          responsePreview: error.responsePreview ?? null
        }
      : {
          error: error instanceof Error ? error.message : "unknown"
        };
  logger.warn(scope, { ...extra, ...details });
}

function shouldQuarantineEvent(event: QueuedEvent): boolean {
  return event.attempts >= MAX_SYNC_ATTEMPTS;
}

function quarantineUndeliverableEvent(event: QueuedEvent, reason: string): void {
  markEventDelivered(event.id);
  logger.error("sync-event-quarantined", {
    id: event.id,
    eventUuid: event.eventUuid,
    eventKind: event.eventKind,
    attempts: event.attempts,
    reason
  });
}

export async function uploadPreparedQueuedEvents(
  prepared: PreparedQueuedEvent[],
  requestOptions: api.AuthAwareRequestOptions
): Promise<void> {
  if (prepared.length === 0) {
    return;
  }
  await api.ingestEventsBatch(
    prepared.map((entry) => entry.payload),
    requestOptions
  );
}

export async function syncPreparedQueuedEvents(
  prepared: PreparedQueuedEvent[],
  requestOptions: api.AuthAwareRequestOptions
): Promise<{ deliveredIds: number[]; nextRetryAt: string | null; failedCount: number }> {
  const deliverable = prepared.filter((entry) => !shouldQuarantineEvent(entry.event));
  for (const entry of prepared) {
    if (shouldQuarantineEvent(entry.event)) {
      quarantineUndeliverableEvent(entry.event, "max_attempts");
    }
  }

  if (deliverable.length === 0) {
    return { deliveredIds: [], nextRetryAt: null, failedCount: 0 };
  }

  try {
    await uploadPreparedQueuedEvents(deliverable, requestOptions);
    const deliveredIds = deliverable.map((entry) => entry.event.id);
    markEventsDelivered(deliveredIds);
    return { deliveredIds, nextRetryAt: null, failedCount: 0 };
  } catch (error) {
    logSyncApiError("sync-batch-failed", error, {
      count: deliverable.length,
      kinds: Array.from(new Set(deliverable.map((entry) => entry.event.eventKind)))
    });

    let nextRetryAt: string | null = null;
    let deliveredIds: number[] = [];
    let failedCount = 0;

    for (const entry of deliverable) {
      try {
        await uploadPreparedQueuedEvents([entry], requestOptions);
        markEventDelivered(entry.event.id);
        deliveredIds.push(entry.event.id);
      } catch (singleError) {
        failedCount += 1;
        logSyncApiError("sync-event-failed", singleError, {
          id: entry.event.id,
          eventUuid: entry.event.eventUuid,
          eventKind: entry.event.eventKind,
          attempts: entry.event.attempts + 1
        });
        const scheduled = markEventForRetry(entry.event.id, entry.event.attempts + 1);
        nextRetryAt = nextRetryAt ?? scheduled;
      }
    }

    if (deliveredIds.length > 0) {
      logger.info("sync-batch-partial-delivered", {
        delivered: deliveredIds.length,
        failed: failedCount
      });
    }

    if (failedCount > 0) {
      throw error;
    }

    return { deliveredIds, nextRetryAt, failedCount };
  }
}

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

      const prepared = events.map(parseQueuedBatchEvent);
      let nextRetryAt: string | null = null;

      try {
        logger.info("sync-batch-attempt", {
          count: prepared.length,
          kinds: Array.from(new Set(events.map((event) => event.eventKind)))
        });
        const result = await syncPreparedQueuedEvents(prepared, {
          ...ctx,
          onAuthRefresh: refreshAuthSession
        });
        nextRetryAt = result.nextRetryAt;
        if (result.deliveredIds.length > 0) {
          logger.info("sync-batch-delivered", { count: result.deliveredIds.length });
          this.onSyncResult?.({ ok: true, statusCode: 200, message: "batch_delivered" });
          this.status.online = true;
          this.status.lastError = null;
          this.status.lastSyncAt = new Date().toISOString();
        }
      } catch (error) {
        this.onSyncResult?.({
          ok: false,
          statusCode: error instanceof api.ApiError ? error.statusCode ?? null : null,
          message: error instanceof Error ? error.message : "sync_failed"
        });
        if (error instanceof api.ApiError && error.kind === "network") {
          this.status.online = false;
          this.status.lastError = "offline";
        } else {
          this.status.lastError = error instanceof Error ? error.message : "sync_failed";
        }
        const remaining = getPendingCount();
        if (remaining > 0) {
          this.maybeNotifySyncFailure(remaining);
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

  private maybeNotifySyncFailure(pendingCount: number): void {
    if (pendingCount <= 0) {
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
          ? `Tracking data is queued offline (${pendingCount} item${pendingCount === 1 ? "" : "s"} pending).`
          : `Could not upload tracking data (${pendingCount} pending). Will retry automatically.`
    });
  }

  private publishStatus(): void {
    this.window.webContents.send("tracking:sync-status-push", this.getStatus());
  }
}
