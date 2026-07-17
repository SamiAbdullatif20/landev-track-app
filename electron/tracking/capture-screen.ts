import { desktopCapturer, nativeImage, screen } from "electron";
import { logger } from "../config/logger";

export type CapturedScreenshot = {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/jpeg";
};

/**
 * Capture the primary display as a compressed JPEG.
 * Uses Electron nativeImage only (no sharp) so packaged Windows builds
 * never crash on missing native sharp binaries.
 */
export async function capturePrimaryDisplayJpeg(
  maxWidth = 1280,
  targetBytes = 180_000
): Promise<CapturedScreenshot | null> {
  try {
    const display = screen.getPrimaryDisplay();
    const scale = display.scaleFactor || 1;
    const width = Math.max(1, Math.round(display.bounds.width * scale));
    const height = Math.max(1, Math.round(display.bounds.height * scale));
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height }
    });
    const primary =
      sources.find((source) => source.display_id === String(display.id))
      ?? sources.find((source) => source.id.toLowerCase().includes("screen"))
      ?? sources[0];
    if (!primary || primary.thumbnail.isEmpty()) {
      logger.warn("screenshot-capture-empty");
      return null;
    }

    let image = primary.thumbnail;
    const size = image.getSize();
    if (size.width > maxWidth) {
      const nextHeight = Math.max(1, Math.round((size.height * maxWidth) / size.width));
      image = image.resize({ width: maxWidth, height: nextHeight, quality: "better" });
    }

    let quality = 70;
    let buffer = image.toJPEG(quality);
    while (buffer.length > targetBytes && quality > 40) {
      quality -= 10;
      buffer = image.toJPEG(quality);
    }

    const out = image.getSize();
    return {
      buffer,
      width: out.width,
      height: out.height,
      mimeType: "image/jpeg"
    };
  } catch (error) {
    logger.warn("screenshot-capture-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}
