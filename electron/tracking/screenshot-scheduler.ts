import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as api from "../api/client";
import { logger } from "../config/logger";
import { refreshAuthSession, readAuthContext } from "../services/auth-session";
import { uploadScreenshotDirect } from "../services/screenshot-direct-upload";
import {
  enqueueScreenshot,
  listPendingScreenshots,
  markScreenshotDelivered,
  markScreenshotRetry,
  screenshotQueueDir
} from "../db/local-store";
import { capturePrimaryDisplayJpeg } from "./capture-screen";

const FIRST_SHOT_MS = 60_000;
const INTERVAL_MS = 20 * 60_000;

type SessionShotContext = {
  projectId: string | null;
  sessionId: string | null;
};

export class ScreenshotScheduler {
  private timer: NodeJS.Timeout | null = null;
  private startedAtMs = 0;
  private bootstrapDone = false;
  private context: SessionShotContext = { projectId: null, sessionId: null };
  private running = false;
  private inFlight = false;

  start(
    context: SessionShotContext,
    options?: { sessionStartedAtMs?: number }
  ): void {
    this.stop();
    this.running = true;
    this.context = context;
    this.startedAtMs = options?.sessionStartedAtMs ?? Date.now();
    const elapsed = Math.max(0, Date.now() - this.startedAtMs);
    this.bootstrapDone = elapsed >= FIRST_SHOT_MS;
    this.scheduleNext();
    logger.info("screenshot-scheduler-started", {
      firstAfterMs: FIRST_SHOT_MS,
      everyMs: INTERVAL_MS,
      resumed: Boolean(options?.sessionStartedAtMs),
      bootstrapDone: this.bootstrapDone
    });
  }

  updateContext(context: Partial<SessionShotContext>): void {
    this.context = { ...this.context, ...context };
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    const elapsed = Math.max(0, Date.now() - this.startedAtMs);
    let delay: number;
    if (!this.bootstrapDone) {
      delay = Math.max(0, FIRST_SHOT_MS - elapsed);
    } else {
      const sinceFirst = elapsed - FIRST_SHOT_MS;
      const nextIntervalIndex = Math.floor(sinceFirst / INTERVAL_MS) + 1;
      const nextAt = FIRST_SHOT_MS + nextIntervalIndex * INTERVAL_MS;
      delay = Math.max(0, nextAt - elapsed);
    }
    this.timer = setTimeout(() => {
      void this.tick();
    }, delay);
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    try {
      await this.captureAndUpload();
      if (!this.bootstrapDone) {
        this.bootstrapDone = true;
      }
    } catch (error) {
      logger.warn("screenshot-scheduler-tick-failed", {
        error: error instanceof Error ? error.message : "unknown"
      });
    } finally {
      if (this.running) this.scheduleNext();
    }
  }

  private authOptions(): api.AuthAwareRequestOptions {
    return {
      ...readAuthContext(),
      onAuthRefresh: refreshAuthSession
    };
  }

  async captureAndUpload(): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      if (!this.context.sessionId) {
        try {
          const sessionId = await api.fetchActiveSessionId(this.authOptions());
          if (sessionId) {
            this.context.sessionId = sessionId;
          }
        } catch {
          // continue; screenshot can queue without session id
        }
      }

      const capture = await capturePrimaryDisplayJpeg();
      if (!capture) return;
      const uploadUuid = randomUUID();
      const capturedAt = new Date().toISOString();
      const metadata = {
        uploadUuid,
        width: capture.width,
        height: capture.height,
        source: "landev-tracker-v2",
        sessionBootstrap: !this.bootstrapDone
      };
      const payload = {
        capturedAt,
        imageBytes: capture.buffer,
        mimeType: capture.mimeType,
        projectId: this.context.projectId,
        sessionId: this.context.sessionId ?? undefined,
        metadata
      };
      try {
        await uploadScreenshotDirect(payload, this.authOptions());
        logger.info("screenshot-uploaded", { uploadUuid, bytes: capture.buffer.length });
      } catch (error) {
        const filePath = path.join(screenshotQueueDir(), `${uploadUuid}.jpg`);
        fs.writeFileSync(filePath, capture.buffer);
        enqueueScreenshot({
          uploadUuid,
          capturedAt,
          filePath,
          mimeType: capture.mimeType,
          projectId: this.context.projectId,
          sessionId: this.context.sessionId,
          metadataJson: JSON.stringify(metadata)
        });
        logger.warn("screenshot-queued-offline", {
          uploadUuid,
          error: error instanceof Error ? error.message : "unknown"
        });
      }
    } finally {
      this.inFlight = false;
    }
  }

  async flushQueue(): Promise<void> {
    const pending = listPendingScreenshots(10);
    for (const row of pending) {
      try {
        if (!fs.existsSync(row.filePath)) {
          markScreenshotDelivered(row.id);
          continue;
        }
        const imageBytes = fs.readFileSync(row.filePath);
        const metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
        let sessionId = row.sessionId;
        if (!sessionId) {
          sessionId = await api.fetchActiveSessionId(this.authOptions());
        }
        await uploadScreenshotDirect(
          {
            capturedAt: row.capturedAt,
            imageBytes,
            mimeType: "image/jpeg",
            projectId: row.projectId,
            sessionId: sessionId ?? undefined,
            metadata: { ...metadata, uploadUuid: row.uploadUuid }
          },
          this.authOptions()
        );
        markScreenshotDelivered(row.id);
        try {
          fs.unlinkSync(row.filePath);
        } catch {
          // ignore cleanup failure
        }
      } catch (error) {
        markScreenshotRetry(row.id, row.attempts + 1);
        logger.warn("screenshot-queue-retry", {
          id: row.id,
          attempts: row.attempts + 1,
          error: error instanceof Error ? error.message : "unknown"
        });
      }
    }
  }
}
