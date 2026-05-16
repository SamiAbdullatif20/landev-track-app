import { desktopCapturer } from "electron";
import axios from "axios";
import { logger } from "../config/logger";
import { getClientIanaTimeZone } from "../config/client-timezone";

const SCREENSHOT_INTERVAL_MS = 6 * 60 * 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CAPTURE_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 }
] as const;

type SessionContext = {
  projectId: string | null;
  sessionId: string | null;
};

type ScreenshotUploadInput = {
  capturedAt: string;
  imageBase64: string;
  mimeType: "image/png";
  projectId: string | null;
  sessionId?: string;
  metadata: {
    width: number;
    height: number;
    source: string;
    clientTimeZone: string;
  };
};

type ScreenshotWorkerOptions = {
  uploadScreenshot: (payload: ScreenshotUploadInput) => Promise<void>;
};

export class ScreenshotWorker {
  private readonly uploadScreenshot: (payload: ScreenshotUploadInput) => Promise<void>;

  private interval: NodeJS.Timeout | null = null;

  private context: SessionContext = { projectId: null, sessionId: null };

  constructor(options: ScreenshotWorkerOptions) {
    this.uploadScreenshot = options.uploadScreenshot;
  }

  public async start(context: SessionContext): Promise<void> {
    this.context = context;
    if (this.interval) return;
    await this.captureNow();
    this.interval = setInterval(() => {
      this.captureNow().catch((error) => logger.warn("screenshot-capture-failed", { error }));
    }, SCREENSHOT_INTERVAL_MS);
    logger.info("screenshot-worker-started", { intervalMs: SCREENSHOT_INTERVAL_MS });
  }

  public stop(): void {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
    logger.info("screenshot-worker-stopped");
  }

  private async captureNow(): Promise<void> {
    if (!this.interval) {
      return;
    }
    let uploadError: unknown = null;

    for (const size of CAPTURE_SIZES) {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: size.width, height: size.height }
      });
      const source = sources[0];
      if (!source) {
        logger.warn("screenshot-source-missing");
        return;
      }
      const png = source.thumbnail.toPNG();
      if (!png || png.length === 0) {
        logger.warn("screenshot-empty");
        return;
      }
      if (png.length > MAX_IMAGE_BYTES) {
        logger.warn("screenshot-oversize-before-upload", {
          bytes: png.length,
          maxBytes: MAX_IMAGE_BYTES,
          width: size.width,
          height: size.height
        });
        continue;
      }

      const capturedAt = new Date().toISOString();
      try {
        await this.uploadScreenshot({
          capturedAt,
          imageBase64: png.toString("base64"),
          mimeType: "image/png",
          projectId: this.context.projectId,
          ...(this.context.sessionId ? { sessionId: this.context.sessionId } : {}),
          metadata: {
            width: source.thumbnail.getSize().width,
            height: source.thumbnail.getSize().height,
            source: "desktop-agent",
            clientTimeZone: getClientIanaTimeZone()
          }
        });
        logger.info("screenshot-uploaded", {
          capturedAt,
          projectId: this.context.projectId,
          hasSessionId: Boolean(this.context.sessionId),
          width: size.width,
          height: size.height
        });
        return;
      } catch (error) {
        uploadError = error;
        if (axios.isAxiosError(error) && error.response?.status === 413) {
          logger.warn("screenshot-upload-413-retrying-lower-resolution", {
            status: error.response.status,
            width: size.width,
            height: size.height
          });
          continue;
        }
        throw error;
      }
    }

    if (uploadError) {
      throw uploadError;
    }
    logger.warn("screenshot-skipped-all-sizes-too-large", {
      maxBytes: MAX_IMAGE_BYTES
    });
  }
}
