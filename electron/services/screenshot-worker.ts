import { logger } from "../config/logger";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { getSessionState } from "../db/queue-repo";
import { trimWorkingSetAfterHeavyWork } from "../utils/memory-trim";
import {
  delayMsUntilEarlierTarget,
  designerIntervalMs,
  initialDesignerTargetMs,
  initialSuperadminTargetMs,
  scheduleForVisibility,
  schedulesDueAtElapsed,
  superadminIntervalMs,
  type ScreenshotSchedule
} from "./screenshot-schedules";
import {
  CAPTURE_SIZES,
  capturePrimaryScreenJpeg,
  type ScreenCaptureJpegResult
} from "./screenshot-capture";
import { TARGET_SCREENSHOT_BYTES } from "./screenshot-compress";
import { shouldSkipScreenshotCapture } from "./capture-guard-windows";
import { getMouseStatsForPeriod } from "./input-activity-rollup";

type SessionContext = {
  projectId: string | null;
  sessionId: string | null;
};

export type ScreenshotUploadInput = {
  capturedAt: string;
  imageBytes: Buffer;
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
    displayIndex?: number;
    displayCount?: number;
    displayId?: string;
    /** Mouse % for this screenshot's interval only (not session cumulative). */
    mouseMovePercent?: number;
    mouseActiveSeconds?: number;
    activityPeriodSeconds?: number;
    activityPeriodStartAt?: string;
    activityPeriodEndAt?: string;
    activitySampleCount?: number;
    /** Stable id for server-side dedup on retry / offline queue flush. */
    uploadUuid?: string;
  };
};

type ScreenshotWorkerOptions = {
  uploadScreenshot: (payload: ScreenshotUploadInput) => Promise<void>;
};

type DueScheduleCapture = {
  schedule: ScreenshotSchedule;
  cadenceTargetMs: number;
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
      runsInMainProcess: true,
      captureMode: "primary-display-gdi"
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
    return schedulesDueAtElapsed(
      elapsedMs,
      this.nextSuperadminTargetMs,
      this.nextDesignerTargetMs
    );
  }

  private advanceTargetsAfterCapture(schedule: ScreenshotSchedule): void {
    if (schedule.visibility === "superadmin_only") {
      this.nextSuperadminTargetMs += superadminIntervalMs();
    } else if (schedule.visibility === "admin_and_employee") {
      this.nextDesignerTargetMs += designerIntervalMs();
    }
  }

  private cadenceTargetMsFor(schedule: ScreenshotSchedule): number {
    return schedule.visibility === "superadmin_only"
      ? this.nextSuperadminTargetMs
      : this.nextDesignerTargetMs;
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
    const toleranceMs = 500;
    const superadminDue = elapsedMs + toleranceMs >= this.nextSuperadminTargetMs;
    const designerDue = elapsedMs + toleranceMs >= this.nextDesignerTargetMs;
    const overlapBothDue = superadminDue && designerDue;
    const due = this.schedulesDueNow(elapsedMs);

    if (due.length === 0) {
      this.scheduleNextCapture();
      return;
    }

    const dueCaptures: DueScheduleCapture[] = due.map((schedule) => ({
      schedule,
      cadenceTargetMs: this.cadenceTargetMsFor(schedule)
    }));

    try {
      await this.captureAndUploadSchedules(dueCaptures);
    } catch (error) {
      logger.warn("screenshot-capture-failed", {
        scheduleCount: dueCaptures.length,
        error: error instanceof Error ? error.message : "unknown"
      });
    } finally {
      if (overlapBothDue) {
        const superadminSchedule = scheduleForVisibility("superadmin_only");
        const employeeSchedule = scheduleForVisibility("admin_and_employee");
        if (superadminSchedule) {
          this.advanceTargetsAfterCapture(superadminSchedule);
        }
        if (employeeSchedule) {
          this.advanceTargetsAfterCapture(employeeSchedule);
        }
      } else {
        for (const entry of dueCaptures) {
          this.advanceTargetsAfterCapture(entry.schedule);
        }
      }
    }

    if (this.running) {
      this.scheduleNextCapture();
    }
  }

  private async captureAndUploadSchedules(dueCaptures: DueScheduleCapture[]): Promise<void> {
    if (!this.running || dueCaptures.length === 0) {
      return;
    }

    if (this.captureInFlight) {
      logger.info("screenshot-skip-capture-in-flight", {
        scheduleCount: dueCaptures.length
      });
      return;
    }

    this.captureInFlight = true;
    try {
      const guard = await shouldSkipScreenshotCapture();
      if (guard.shouldSkipCapture) {
        logger.info("screenshot-skipped-non-interference-guard", {
          scheduleCount: dueCaptures.length,
          reason: guard.reason,
          processName: guard.processName,
          windowTitle: guard.windowTitle
        });
        return;
      }

      let capture: ScreenCaptureJpegResult | null = null;

      for (const size of CAPTURE_SIZES) {
        capture = await capturePrimaryScreenJpeg(size, TARGET_SCREENSHOT_BYTES);
        if (!capture) {
          continue;
        }

        const capturedAt = new Date().toISOString();
        const captureMs = Date.parse(capturedAt);

        try {
          for (const entry of dueCaptures) {
            const { schedule, cadenceTargetMs } = entry;
            const periodMs = schedule.intervalMinutes * 60 * 1000;
            const periodMouse = getMouseStatsForPeriod(captureMs, periodMs);
            const imageBytes = capture.buffer;

            await this.uploadScreenshot({
              capturedAt,
              imageBytes,
              mimeType: "image/jpeg",
              projectId: this.context.projectId,
              ...(this.context.sessionId ? { sessionId: this.context.sessionId } : {}),
              metadata: {
                width: capture.width,
                height: capture.height,
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
                jpegQuality: capture.quality,
                compressedBytes: capture.compressedBytes,
                screenSourceId: capture.sourceId,
                screenSourceName: capture.sourceName,
                displayIndex: 0,
                displayCount: 1,
                ...(capture.displayId ? { displayId: capture.displayId } : {})
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
              compressedBytes: capture.compressedBytes,
              jpegQuality: capture.quality,
              screenSourceId: capture.sourceId,
              displayIndex: 0,
              displayCount: 1,
              sharedCapture: dueCaptures.length > 1
            });
          }

          capture = null;
          return;
        } catch (error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 413) {
            logger.warn("screenshot-upload-413-retrying-lower-resolution", {
              scheduleCount: dueCaptures.length,
              width: size.width,
              height: size.height
            });
            capture = null;
            continue;
          }
          throw error;
        }
      }

      logger.warn("screenshot-skipped-capture-failed", {
        scheduleCount: dueCaptures.length
      });
    } finally {
      this.captureInFlight = false;
      void trimWorkingSetAfterHeavyWork();
    }
  }

  /** @internal Test hook for single-schedule capture. */
  async captureAndUpload(schedule: ScreenshotSchedule, cadenceTargetMs: number): Promise<void> {
    await this.captureAndUploadSchedules([{ schedule, cadenceTargetMs }]);
  }
}
