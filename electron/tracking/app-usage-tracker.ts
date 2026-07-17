import { randomUUID } from "node:crypto";
import {
  addAppUsageSeconds,
  enqueueTrackingEvent,
  listPendingEvents,
  listTodayAppUsage,
  localWorkDateKey,
  markEventDelivered,
  markEventRetry,
  type AppUsageRow
} from "../db/local-store";
import * as api from "../api/client";
import { logger } from "../config/logger";
import { probeForegroundApp, type ForegroundApp } from "./foreground-app";

const SAMPLE_MS = 3_000;
const EMIT_EVERY_MS = 15_000;

export type AppUsageSnapshot = AppUsageRow;

type SessionContext = {
  sessionId: string | null;
  projectId: string | null;
  startedAt: string | null;
  clientTimeZone: string;
};

type OpenSegment = {
  app: ForegroundApp;
  startedAtMs: number;
  lastEmittedAtMs: number;
};

function clientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Samples the foreground app like LogWork: every ~3s, emit APP_FOCUS
 * on change or every 15s with credited activeSeconds.
 */
export class AppUsageTracker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private context: SessionContext = {
    sessionId: null,
    projectId: null,
    startedAt: null,
    clientTimeZone: clientTimeZone()
  };
  private open: OpenSegment | null = null;
  private sampling = false;

  start(context: Partial<SessionContext>): void {
    this.stop(false);
    this.running = true;
    this.context = {
      sessionId: context.sessionId ?? null,
      projectId: context.projectId ?? null,
      startedAt: context.startedAt ?? new Date().toISOString(),
      clientTimeZone: context.clientTimeZone ?? clientTimeZone()
    };
    this.open = null;
    this.timer = setInterval(() => {
      void this.sample();
    }, SAMPLE_MS);
    void this.sample();
    logger.info("app-usage-tracker-started");
  }

  updateContext(partial: Partial<SessionContext>): void {
    this.context = { ...this.context, ...partial };
  }

  stop(flushOpen = true): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (flushOpen) {
      this.closeOpenSegment(Date.now());
    }
    this.open = null;
  }

  getTodayApps(): AppUsageSnapshot[] {
    return listTodayAppUsage();
  }

  private async sample(): Promise<void> {
    if (!this.running || this.sampling) return;
    this.sampling = true;
    try {
      const now = Date.now();
      const app = await probeForegroundApp();
      if (!app) {
        // No resolvable foreground app (denied/shell) — close open segment.
        this.closeOpenSegment(now);
        return;
      }

      if (!this.open) {
        this.open = { app, startedAtMs: now, lastEmittedAtMs: now };
        return;
      }

      const sameApp =
        this.open.app.processName.toLowerCase() === app.processName.toLowerCase() &&
        this.open.app.applicationDisplayName === app.applicationDisplayName;

      if (!sameApp) {
        this.closeOpenSegment(now);
        this.open = { app, startedAtMs: now, lastEmittedAtMs: now };
        return;
      }

      // Refresh window title for nicer metadata.
      this.open.app = app;
      if (now - this.open.lastEmittedAtMs >= EMIT_EVERY_MS) {
        this.emitSegment(this.open, now);
        this.open.lastEmittedAtMs = now;
        this.open.startedAtMs = now;
      }
    } finally {
      this.sampling = false;
    }
  }

  private closeOpenSegment(nowMs: number): void {
    if (!this.open) return;
    this.emitSegment(this.open, nowMs);
    this.open = null;
  }

  private emitSegment(segment: OpenSegment, endMs: number): void {
    const activeSeconds = Math.max(0, Math.round((endMs - segment.startedAtMs) / 1000));
    if (activeSeconds < 1) return;

    const app = segment.app;
    addAppUsageSeconds({
      displayName: app.applicationDisplayName,
      processName: app.processName,
      application: app.application,
      seconds: activeSeconds
    });

    const occurredAt = new Date(endMs).toISOString();
    const workDateKey = localWorkDateKey(new Date(endMs));
    const eventUuid = randomUUID();
    const sessionId = this.context.sessionId;

    const payload: Record<string, unknown> = {
      eventUuid,
      eventKind: "APP_FOCUS",
      type: "APP_FOCUS",
      occurredAt,
      occurredAtIso: occurredAt,
      workDateKey,
      clientTimeZone: this.context.clientTimeZone,
      projectId: this.context.projectId,
      workSessionId: sessionId,
      sessionId,
      sessionSegmentStartedAt: this.context.startedAt,
      appName: app.applicationDisplayName,
      applicationDisplayName: app.applicationDisplayName,
      application: app.application,
      processName: app.processName,
      windowTitle: app.windowTitle,
      activeSeconds,
      idleSeconds: 0,
      metadata: {
        application: app.application,
        applicationDisplayName: app.applicationDisplayName,
        processName: app.processName,
        windowTitle: app.windowTitle,
        activeSeconds,
        idleSeconds: 0,
        source: "landev-tracker-v2"
      }
    };

    enqueueTrackingEvent({ eventUuid, eventKind: "APP_FOCUS", payload });
  }

  async flushEvents(options: api.AuthAwareRequestOptions): Promise<void> {
    const pending = listPendingEvents(40);
    if (pending.length === 0) return;

    const events = pending.map((row) => JSON.parse(row.payloadJson) as Record<string, unknown>);
    try {
      await api.postTrackingEventsBatch({ events }, options);
      for (const row of pending) {
        markEventDelivered(row.id);
      }
      logger.info("app-focus-events-flushed", { count: pending.length });
    } catch (error) {
      for (const row of pending) {
        markEventRetry(row.id, row.attempts + 1);
      }
      logger.warn("app-focus-events-flush-failed", {
        count: pending.length,
        error: error instanceof Error ? error.message : "unknown"
      });
    }
  }
}
