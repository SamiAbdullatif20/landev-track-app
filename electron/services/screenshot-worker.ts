import { logger } from "../config/logger";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { getSessionState } from "../db/queue-repo";
import {
  delayMsUntilEarlierTarget,
  designerIntervalMs,
  initialDesignerTargetMs,
  initialSuperadminTargetMs,
  scheduleForVisibility,
  superadminIntervalMs,
  type ScreenshotSchedule
} from "./screenshot-schedules";
import {
  CAPTURE_SIZES,
  capturePrimaryScreenPng
} from "./screenshot-capture";
import { compressPngToJpeg, TARGET_SCREENSHOT_BYTES } from "./screenshot-compress";
import { shouldSkipScreenshotCapture } from "./capture-guard-windows";
import { getMouseStatsForPeriod } from "./input-activity-rollup";

type SessionContext = {
  projectId: string | null;
  sessionId: string | null;
};

export type ScreenshotUploadInput = {
  capturedAt: string;
  imageBase64: string;
  mimeType: "image/jpeg";
  projectId: string | null;
  sessionId?: string;
  metadata: {
    width: number;
    height: number;
    source: string;
    clientTimeZone: string;
    intervalMinutes: number;
    visibility: ScreenshotSchedule["visibility"];
    visibleToRoles: string[];
    cadenceTargetMs?: number;
    jpegQuality?: number;
    originalPngBytes?: number;
    compressedBytes?: number;
    screenSourceId?: string;
    screenSourceName?: string;
    /** Mouse % for this screenshot's interval only (not session cumulative). */
    mouseMovePercent?: number;
    mouseActiveSeconds?: number;
    activityPeriodSeconds?: number;
    activityPeriodStartAt?: string;
    activityPeriodEndAt?: string;
    activitySampleCount?: number;
  };
};

type ScreenshotWorkerOptions = {
  uploadScreenshot: (payload: ScreenshotUploadInput) => Promise<void>;
};

/**
 * Admin-only screenshots every 6 minutes; employee-visible every 10 minutes.
 * One timer schedules the earlier of the two next targets (both may fire at 10m, 20m, …).
 */
export class ScreenshotWorker {
  private readonly uploadScreenshot: (payload: ScreenshotUploadInput) => Promise<void>;
  private timeoutHandle: NodeJS.Timeout | null = null;
  private context: SessionContext = { projectId: null, sessionId: null };
  private running = false;
  private captureInFlight = false;
  private startedAtMs = 0;
  private nextSuperadminTargetMs = initialSuperadminTargetMs();
  private nextDesignerTargetMs = initialDesignerTargetMs();

  constructor(options: ScreenshotWorkerOptions) {
    this.uploadScreenshot = options.uploadScreenshot;
  }

  public async start(context: SessionContext): Promise<void> {
    this.clearScheduledCapture();
    this.context = context;
    this.running = true;
    this.startedAtMs = Date.now();
    this.nextSuperadminTargetMs = initialSuperadminTargetMs();
    this.nextDesignerTargetMs = initialDesignerTargetMs();
    this.scheduleNextCapture();
    logger.info("screenshot-cadence-started", {
      superadminEveryMinutes: 6,
      designerEveryMinutes: 10,
      firstSuperadminTargetMs: this.nextSuperadminTargetMs,
      firstDesignerTargetMs: this.nextDesignerTargetMs,
      runsInMainProcess: true
    });
  }

  public stop(): void {
    this.running = false;
    this.clearScheduledCapture();
    this.nextSuperadminTargetMs = initialSuperadminTargetMs();
    this.nextDesignerTargetMs = initialDesignerTargetMs();
    logger.info("screenshot-worker-stopped");
  }

  public isActive(): boolean {
    return this.running;
  }

  private clearScheduledCapture(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private schedulesDueNow(elapsedMs: number): ScreenshotSchedule[] {
    const due: ScreenshotSchedule[] = [];
    const toleranceMs = 500;

    if (elapsedMs + toleranceMs >= this.nextSuperadminTargetMs) {
      const schedule = scheduleForVisibility("superadmin_only");
      if (schedule) {
        due.push(schedule);
      }
    }

    if (elapsedMs + toleranceMs >= this.nextDesignerTargetMs) {
      const schedule = scheduleForVisibility("admin_and_employee");
      if (schedule) {
        due.push(schedule);
      }
    }

    return due;
  }

  private advanceTargetsAfterCapture(schedule: ScreenshotSchedule): void {
    if (schedule.visibility === "superadmin_only") {
      this.nextSuperadminTargetMs += superadminIntervalMs();
    } else if (schedule.visibility === "admin_and_employee") {
      this.nextDesignerTargetMs += designerIntervalMs();
    }
  }

  private scheduleNextCapture(): void {
    if (!this.running) {
      return;
    }

    this.clearScheduledCapture();
    const delayMs = delayMsUntilEarlierTarget(
      this.startedAtMs,
      this.nextSuperadminTargetMs,
      this.nextDesignerTargetMs
    );

    this.timeoutHandle = setTimeout(() => {
      void this.runScheduledCaptures();
    }, delayMs);

    logger.info("screenshot-cadence-tick-scheduled", {
      delayMs,
      nextSuperadminTargetMs: this.nextSuperadminTargetMs,
      nextDesignerTargetMs: this.nextDesignerTargetMs,
      elapsedMs: Date.now() - this.startedAtMs
    });
  }

  private async runScheduledCaptures(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (!getSessionState().active) {
      logger.info("screenshot-skip-inactive-session");
      this.scheduleNextCapture();
      return;
    }

    const elapsedMs = Date.now() - this.startedAtMs;
    const due = this.schedulesDueNow(elapsedMs);

    if (due.length === 0) {
      this.scheduleNextCapture();
      return;
    }

    for (const schedule of due) {
      const targetMs =
        schedule.visibility === "superadmin_only"
          ? this.nextSuperadminTargetMs
          : this.nextDesignerTargetMs;

      try {
        await this.captureAndUpload(schedule, targetMs);
      } catch (error) {
        logger.warn("screenshot-capture-failed", {
          visibility: schedule.visibility,
          cadenceTargetMs: targetMs,
          error: error instanceof Error ? error.message : "unknown"
        });
      } finally {
        this.advanceTargetsAfterCapture(schedule);
      }
    }

    if (this.running) {
      this.scheduleNextCapture();
    }
  }

  private async captureAndUpload(schedule: ScreenshotSchedule, cadenceTargetMs: number): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.captureInFlight) {
      logger.info("screenshot-skip-capture-in-flight", {
        visibility: schedule.visibility,
        cadenceTargetMs
      });
      return;
    }

    this.captureInFlight = true;
    try {
      const guard = await shouldSkipScreenshotCapture();
      if (guard.shouldSkipCapture) {
        logger.info("screenshot-skipped-non-interference-guard", {
          visibility: schedule.visibility,
          cadenceTargetMs,
          reason: guard.reason,
          processName: guard.processName,
          windowTitle: guard.windowTitle
        });
        return;
      }

      let lastUploadError: unknown = null;

      for (const size of CAPTURE_SIZES) {
        const capture = await capturePrimaryScreenPng(size);
        if (!capture) {
          continue;
        }

        const compressed = compressPngToJpeg(capture.png, capture.width, capture.height, TARGET_SCREENSHOT_BYTES);
        if (!compressed) {
          logger.warn("screenshot-compress-failed", {
            visibility: schedule.visibility,
            cadenceTargetMs,
            pngBytes: capture.png.length
          });
          continue;
        }

        const capturedAt = new Date().toISOString();
        const captureMs = Date.parse(capturedAt);
        const periodMs = schedule.intervalMinutes * 60 * 1000;
        const periodMouse = getMouseStatsForPeriod(captureMs, periodMs);
        try {
          await this.uploadScreenshot({
            capturedAt,
            imageBase64: compressed.buffer.toString("base64"),
            mimeType: "image/jpeg",
            projectId: this.context.projectId,
            ...(this.context.sessionId ? { sessionId: this.context.sessionId } : {}),
            metadata: {
              width: compressed.width,
              height: compressed.height,
              source: "desktop-agent",
              clientTimeZone: getClientIanaTimeZone(),
              intervalMinutes: schedule.intervalMinutes,
              visibility: schedule.visibility,
              visibleToRoles: [...schedule.visibleToRoles],
              cadenceTargetMs,
              mouseMovePercent: periodMouse.mouseMovePercent,
              mouseActiveSeconds: periodMouse.mouseActiveSeconds,
              activityPeriodSeconds: periodMouse.activityPeriodSeconds,
              activityPeriodStartAt: periodMouse.activityPeriodStartAt,
              activityPeriodEndAt: periodMouse.activityPeriodEndAt,
              activitySampleCount: periodMouse.sampleCount,
              jpegQuality: compressed.quality,
              originalPngBytes: compressed.originalBytes,
              compressedBytes: compressed.compressedBytes,
              screenSourceId: capture.sourceId,
              screenSourceName: capture.sourceName
            }
          });
          logger.info("screenshot-uploaded", {
            capturedAt,
            visibility: schedule.visibility,
            intervalMinutes: schedule.intervalMinutes,
            cadenceTargetMs,
            periodMousePercent: periodMouse.mouseMovePercent,
            periodMouseSeconds: periodMouse.mouseActiveSeconds,
            projectId: this.context.projectId,
            hasSessionId: Boolean(this.context.sessionId),
            originalPngBytes: compressed.originalBytes,
            compressedBytes: compressed.compressedBytes,
            jpegQuality: compressed.quality,
            screenSourceId: capture.sourceId
          });
          return;
        } catch (error) {
          lastUploadError = error;
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 413) {
            logger.warn("screenshot-upload-413-retrying-lower-resolution", {
              visibility: schedule.visibility,
              cadenceTargetMs,
              width: size.width,
              height: size.height
            });
            continue;
          }
          throw error;
        }
      }

      if (lastUploadError) {
        throw lastUploadError;
      }
      logger.warn("screenshot-skipped-compress-failed", {
        visibility: schedule.visibility,
        cadenceTargetMs
      });
    } finally {
      this.captureInFlight = false;
    }
  }
}
