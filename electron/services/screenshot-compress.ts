import { nativeImage, type NativeImage } from "electron";

/** Target max bytes after JPEG compression (before upload). */
export const TARGET_SCREENSHOT_BYTES = 520 * 1024;

/** Prefer this JPEG quality when it still fits the byte budget. */
export const PREFERRED_JPEG_QUALITY = 88;

const JPEG_QUALITY_CEILING = 92;
const JPEG_QUALITY_FLOOR = 68;
const JPEG_QUALITY_FALLBACK = 58;

/** Max upload width — downscale larger captures (better than crushing JPEG quality). */
export const SCREENSHOT_MAX_UPLOAD_WIDTH = 1600;

const FALLBACK_MAX_UPLOAD_WIDTH = 1280;

export type CompressedScreenshot = {
  buffer: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  quality: number;
  originalBytes: number;
  compressedBytes: number;
};

export function computeScaledDimensions(
  width: number,
  height: number,
  maxWidth: number
): { width: number; height: number } {
  if (width <= maxWidth || width <= 0 || height <= 0) {
    return { width, height };
  }
  const scale = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(height * scale))
  };
}

function scaleImageToMaxWidth(image: NativeImage, maxWidth: number): NativeImage {
  const { width, height } = image.getSize();
  const target = computeScaledDimensions(width, height, maxWidth);
  if (target.width === width && target.height === height) {
    return image;
  }
  return image.resize({
    width: target.width,
    height: target.height,
    quality: "best"
  });
}

function encodeJpegUnderBudget(
  image: NativeImage,
  targetMaxBytes: number,
  preferredQuality: number
): { buffer: Buffer; quality: number } | null {
  const preferred = image.toJPEG(preferredQuality);
  if (preferred.length > 0 && preferred.length <= targetMaxBytes) {
    return { buffer: preferred, quality: preferredQuality };
  }

  let low = JPEG_QUALITY_FLOOR;
  let high = Math.min(JPEG_QUALITY_CEILING, preferredQuality - 1);
  let best: { buffer: Buffer; quality: number } | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const jpeg = image.toJPEG(mid);
    if (jpeg.length === 0) {
      high = mid - 1;
      continue;
    }
    if (jpeg.length <= targetMaxBytes) {
      best = { buffer: jpeg, quality: mid };
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function buildResult(
  image: NativeImage,
  encoded: { buffer: Buffer; quality: number },
  originalBytes: number
): CompressedScreenshot {
  const { width, height } = image.getSize();
  return {
    buffer: encoded.buffer,
    mimeType: "image/jpeg",
    width,
    height,
    quality: encoded.quality,
    originalBytes,
    compressedBytes: encoded.buffer.length
  };
}

/**
 * Compress PNG screen capture to JPEG before upload.
 * Downscales very wide frames, then picks the highest JPEG quality that fits the byte budget.
 */
export function compressPngToJpeg(
  png: Buffer,
  width: number,
  height: number,
  targetMaxBytes: number = TARGET_SCREENSHOT_BYTES
): CompressedScreenshot | null {
  const image = nativeImage.createFromBuffer(png);
  if (image.isEmpty()) {
    return null;
  }

  const originalBytes = png.length;

  const attempts: Array<{ image: NativeImage; preferredQuality: number }> = [
    { image: scaleImageToMaxWidth(image, SCREENSHOT_MAX_UPLOAD_WIDTH), preferredQuality: PREFERRED_JPEG_QUALITY },
    { image: scaleImageToMaxWidth(image, FALLBACK_MAX_UPLOAD_WIDTH), preferredQuality: 82 }
  ];

  for (const attempt of attempts) {
    const encoded = encodeJpegUnderBudget(attempt.image, targetMaxBytes, attempt.preferredQuality);
    if (encoded) {
      return buildResult(attempt.image, encoded, originalBytes);
    }
  }

  const smallest = scaleImageToMaxWidth(image, FALLBACK_MAX_UPLOAD_WIDTH);
  const fallback = smallest.toJPEG(JPEG_QUALITY_FALLBACK);
  if (fallback.length === 0) {
    return null;
  }

  return buildResult(smallest, { buffer: fallback, quality: JPEG_QUALITY_FALLBACK }, originalBytes);
}
