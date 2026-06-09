import { desktopCapturer, type DesktopCapturerSource } from "electron";
import { logger } from "../config/logger";

export const CAPTURE_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 }
] as const;

export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

/** Prefer the largest physical screen, not the tracker window. */
export function pickPrimaryScreenSource(sources: DesktopCapturerSource[]): DesktopCapturerSource | null {
  const screens = sources.filter((source) => source.id.toLowerCase().startsWith("screen"));
  const candidates = screens.length > 0 ? screens : sources;
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) => {
    const bestSize = best.thumbnail.getSize();
    const currentSize = current.thumbnail.getSize();
    const bestArea = bestSize.width * bestSize.height;
    const currentArea = currentSize.width * currentSize.height;
    return currentArea > bestArea ? current : best;
  });
}

export type ScreenCaptureResult = {
  png: Buffer;
  width: number;
  height: number;
  sourceId: string;
  sourceName: string;
};

export async function capturePrimaryScreenPng(
  size: { width: number; height: number }
): Promise<ScreenCaptureResult | null> {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: size.width, height: size.height },
    fetchWindowIcons: false
  });

  const source = pickPrimaryScreenSource(sources);
  if (!source) {
    logger.warn("screenshot-source-missing", { sourceCount: sources.length });
    return null;
  }

  const png = source.thumbnail.toPNG();
  if (!png || png.length === 0) {
    logger.warn("screenshot-empty", { sourceId: source.id, sourceName: source.name });
    return null;
  }

  const { width, height } = source.thumbnail.getSize();
  return {
    png,
    width,
    height,
    sourceId: source.id,
    sourceName: source.name
  };
}
