import { desktopCapturer, screen, type DesktopCapturerSource, type NativeImage, nativeImage } from "electron";
import { logger } from "../config/logger";
import { releaseNativeImage } from "../utils/native-image";
import { withSilentWindowsCapture } from "../utils/windows-silent-capture";
import {
  PREFERRED_JPEG_QUALITY,
  SCREENSHOT_CAPTURE_MAX_WIDTH,
  TARGET_SCREENSHOT_BYTES,
  computeScaledDimensions,
  encodeNativeImageToJpeg
} from "./screenshot-compress";
import { capturePrimaryScreenGdiJpeg } from "./windows-gdi-capture";

/** Low-RAM capture sizes; only retry smaller on upload 413. */
export const CAPTURE_SIZES = [
  { width: 480, height: 270 },
  { width: 384, height: 216 }
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
  displayId?: string;
};

/** Screen-only sources from desktopCapturer (ignores stray window entries). */
export function listScreenCaptureSources(sources: DesktopCapturerSource[]): DesktopCapturerSource[] {
  const screens = sources.filter((source) => source.id.toLowerCase().startsWith("screen"));
  return screens.length > 0 ? screens : [...sources];
}

function thumbnailArea(source: DesktopCapturerSource): number {
  const size = source.thumbnail.getSize();
  return size.width * size.height;
}

/** Left-to-right, top-to-bottom using Electron display bounds; unknown display_id last by area. */
export function sortScreenSourcesByDisplayOrder(sources: DesktopCapturerSource[]): DesktopCapturerSource[] {
  const screens = listScreenCaptureSources(sources);
  if (screens.length <= 1) {
    return screens;
  }

  const displayOrder = new Map<string, number>();
  const sortedDisplays = [...screen.getAllDisplays()].sort((left, right) => {
    if (left.bounds.x !== right.bounds.x) {
      return left.bounds.x - right.bounds.x;
    }
    return left.bounds.y - right.bounds.y;
  });
  sortedDisplays.forEach((display, index) => {
    displayOrder.set(String(display.id), index);
  });

  const withKnownDisplay: Array<{ source: DesktopCapturerSource; order: number }> = [];
  const withoutDisplay: DesktopCapturerSource[] = [];

  for (const source of screens) {
    const displayId = source.display_id;
    if (displayId && displayOrder.has(displayId)) {
      withKnownDisplay.push({ source, order: displayOrder.get(displayId)! });
    } else {
      withoutDisplay.push(source);
    }
  }

  withKnownDisplay.sort((left, right) => left.order - right.order);
  withoutDisplay.sort((left, right) => thumbnailArea(right) - thumbnailArea(left));

  return [...withKnownDisplay.map((entry) => entry.source), ...withoutDisplay];
}

function encodeThumbnailJpeg(
  thumbnail: NativeImage,
  targetMaxBytes: number
): { buffer: Buffer; quality: number; width: number; height: number } | null {
  const owned: NativeImage[] = [];
  try {
    const { width, height } = thumbnail.getSize();
    const target = computeScaledDimensions(width, height, SCREENSHOT_CAPTURE_MAX_WIDTH);
    let image = thumbnail;
    if (target.width !== width || target.height !== height) {
      image = thumbnail.resize({
        width: target.width,
        height: target.height,
        quality: "good"
      });
      owned.push(image);
    }
    const encoded = encodeNativeImageToJpeg(image, targetMaxBytes);
    if (!encoded) {
      return null;
    }
    const size = image.getSize();
    return { ...encoded, width: size.width, height: size.height };
  } finally {
    for (const image of owned) {
      releaseNativeImage(image);
    }
  }
}

function encodeSourceToJpeg(
  source: DesktopCapturerSource,
  targetMaxBytes: number
): ScreenCaptureJpegResult | null {
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
    compressedBytes: encoded.buffer.length,
    displayId: source.display_id || undefined
  };
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
 * Capture every connected display as JPEG (one result per monitor).
 * Re-fetches sources per display so only one large thumbnail is encoded at a time.
 */
export async function captureAllDisplaysJpeg(
  size: { width: number; height: number },
  targetMaxBytes: number = TARGET_SCREENSHOT_BYTES
): Promise<ScreenCaptureJpegResult[]> {
  const initialSources = await getScreenSources(size);
  const ordered = sortScreenSourcesByDisplayOrder(initialSources);
  for (const candidate of initialSources) {
    releaseNativeImage(candidate.thumbnail);
  }

  if (ordered.length === 0) {
    logger.warn("screenshot-source-missing", { sourceCount: initialSources.length });
    return [];
  }

  const results: ScreenCaptureJpegResult[] = [];
  for (let displayIndex = 0; displayIndex < ordered.length; displayIndex += 1) {
    const batch = await getScreenSources(size);
    const batchOrdered = sortScreenSourcesByDisplayOrder(batch);
    const source = batchOrdered[displayIndex];
    for (const candidate of batch) {
      if (candidate !== source) {
        releaseNativeImage(candidate.thumbnail);
      }
    }
    if (!source) {
      continue;
    }
    const encoded = encodeSourceToJpeg(source, targetMaxBytes);
    if (encoded) {
      results.push(encoded);
    }
  }

  return results;
}

/**
 * Capture primary screen as JPEG directly (no PNG round-trip).
 * On Windows uses GDI in a helper process to avoid desktopCapturer RAM spikes.
 */
export async function capturePrimaryScreenJpeg(
  size: { width: number; height: number },
  targetMaxBytes: number = TARGET_SCREENSHOT_BYTES
): Promise<ScreenCaptureJpegResult | null> {
  const maxWidth = Math.min(size.width, SCREENSHOT_CAPTURE_MAX_WIDTH);

  if (process.platform === "win32") {
    const gdi = await capturePrimaryScreenGdiJpeg(maxWidth, PREFERRED_JPEG_QUALITY);
    if (gdi) {
      let buffer = gdi.buffer;
      let quality = gdi.quality;
      if (buffer.length > targetMaxBytes) {
        const image = nativeImage.createFromBuffer(buffer);
        const reencoded = encodeNativeImageToJpeg(image, targetMaxBytes);
        if (reencoded) {
          buffer = reencoded.buffer;
          quality = reencoded.quality;
        }
      }
      return {
        buffer,
        width: gdi.width,
        height: gdi.height,
        quality,
        sourceId: "gdi:primary",
        sourceName: "Primary Display",
        compressedBytes: buffer.length
      };
    }
    logger.warn("screenshot-gdi-unavailable-fallback-to-desktop-capturer");
  }

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
