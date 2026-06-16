import { desktopCapturer, type DesktopCapturerSource, type NativeImage } from "electron";
import { logger } from "../config/logger";
import { releaseNativeImage } from "../utils/native-image";
import { withSilentWindowsCapture } from "../utils/windows-silent-capture";
import {
  PREFERRED_JPEG_QUALITY,
  TARGET_SCREENSHOT_BYTES,
  encodeNativeImageToJpeg
} from "./screenshot-compress";

/** Default capture size; smaller sizes only used after upload 413. */
export const CAPTURE_SIZES = [
  { width: 1280, height: 720 },
  { width: 1024, height: 576 },
  { width: 960, height: 540 }
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

export type ScreenCaptureJpegResult = {
  buffer: Buffer;
  width: number;
  height: number;
  quality: number;
  sourceId: string;
  sourceName: string;
  compressedBytes: number;
};

function encodeThumbnailJpeg(
  thumbnail: NativeImage,
  targetMaxBytes: number
): { buffer: Buffer; quality: number; width: number; height: number } | null {
  const { width, height } = thumbnail.getSize();
  const encoded = encodeNativeImageToJpeg(thumbnail, targetMaxBytes);
  if (!encoded) {
    return null;
  }
  return { ...encoded, width, height };
}

async function getScreenSources(size: { width: number; height: number }): Promise<DesktopCapturerSource[]> {
  return withSilentWindowsCapture(() =>
    desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: size.width, height: size.height },
      fetchWindowIcons: false
    })
  );
}

/**
 * Capture primary screen as JPEG directly (no PNG round-trip).
 * Keeps peak memory low during screenshot intervals.
 */
export async function capturePrimaryScreenJpeg(
  size: { width: number; height: number },
  targetMaxBytes: number = TARGET_SCREENSHOT_BYTES
): Promise<ScreenCaptureJpegResult | null> {
  const sources = await getScreenSources(size);

  const source = pickPrimaryScreenSource(sources);
  for (const candidate of sources) {
    if (candidate !== source) {
      releaseNativeImage(candidate.thumbnail);
    }
  }
  if (!source) {
    logger.warn("screenshot-source-missing", { sourceCount: sources.length });
    return null;
  }

  const thumbnail = source.thumbnail;
  const encoded = encodeThumbnailJpeg(thumbnail, targetMaxBytes);
  releaseNativeImage(thumbnail);

  if (!encoded || encoded.buffer.length === 0) {
    logger.warn("screenshot-empty", { sourceId: source.id, sourceName: source.name });
    return null;
  }

  return {
    buffer: encoded.buffer,
    width: encoded.width,
    height: encoded.height,
    quality: encoded.quality,
    sourceId: source.id,
    sourceName: source.name,
    compressedBytes: encoded.buffer.length
  };
}

/** @deprecated PNG capture retained for tests only — production uses capturePrimaryScreenJpeg. */
export async function capturePrimaryScreenPng(
  size: { width: number; height: number }
): Promise<{ png: Buffer; width: number; height: number; sourceId: string; sourceName: string } | null> {
  const sources = await getScreenSources(size);

  const source = pickPrimaryScreenSource(sources);
  for (const candidate of sources) {
    if (candidate !== source) {
      releaseNativeImage(candidate.thumbnail);
    }
  }
  if (!source) {
    return null;
  }

  const thumbnail = source.thumbnail;
  const { width, height } = thumbnail.getSize();
  const png = thumbnail.toPNG();
  releaseNativeImage(thumbnail);
  if (!png || png.length === 0) {
    return null;
  }

  return {
    png,
    width,
    height,
    sourceId: source.id,
    sourceName: source.name
  };
}

export { PREFERRED_JPEG_QUALITY, TARGET_SCREENSHOT_BYTES };
