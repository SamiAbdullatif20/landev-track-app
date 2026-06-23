import { nativeImage, type NativeImage } from "electron";
import { releaseNativeImage } from "../utils/native-image";

/** Target max bytes after JPEG compression (before upload). */
export const TARGET_SCREENSHOT_BYTES = 520 * 1024;

/** Prefer this JPEG quality when it still fits the byte budget. */
export const PREFERRED_JPEG_QUALITY = 88;

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

function trackImage(images: NativeImage[], image: NativeImage): NativeImage {
  if (!images.includes(image)) {
    images.push(image);
  }
  return image;
}

function destroyTrackedImages(images: NativeImage[]): void {
  for (const image of images) {
    releaseNativeImage(image);
  }
}

function scaleImageToMaxWidth(
  images: NativeImage[],
  image: NativeImage,
  maxWidth: number
): NativeImage {
  const { width, height } = image.getSize();
  const target = computeScaledDimensions(width, height, maxWidth);
  if (target.width === width && target.height === height) {
    return image;
  }
  const resized = image.resize({
    width: target.width,
    height: target.height,
    quality: "best"
  });
  return trackImage(images, resized);
}

/** JPEG quality steps — preferred first, then fallbacks if over byte budget. */
export const JPEG_ENCODE_QUALITIES = [PREFERRED_JPEG_QUALITY, 76, 64] as const;

export function encodeNativeImageToJpeg(
  image: NativeImage,
  targetMaxBytes: number = TARGET_SCREENSHOT_BYTES
): { buffer: Buffer; quality: number } | null {
  if (image.isEmpty()) {
    return null;
  }

  let fallback: { buffer: Buffer; quality: number } | null = null;
  for (const quality of JPEG_ENCODE_QUALITIES) {
    const jpeg = image.toJPEG(quality);
    if (jpeg.length === 0) {
      continue;
    }
    fallback = { buffer: jpeg, quality };
    if (jpeg.length <= targetMaxBytes) {
      return fallback;
    }
  }

  return fallback;
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
  const ownedImages: NativeImage[] = [];

  try {
    const image = trackImage(ownedImages, nativeImage.createFromBuffer(png));
    if (image.isEmpty()) {
      return null;
    }

    const originalBytes = png.length;

    const attempts: Array<{ image: NativeImage; preferredQuality: number }> = [
      {
        image: scaleImageToMaxWidth(ownedImages, image, SCREENSHOT_MAX_UPLOAD_WIDTH),
        preferredQuality: PREFERRED_JPEG_QUALITY
      },
      {
        image: scaleImageToMaxWidth(ownedImages, image, FALLBACK_MAX_UPLOAD_WIDTH),
        preferredQuality: 82
      }
    ];

    for (const attempt of attempts) {
      const encoded = encodeNativeImageToJpeg(attempt.image, targetMaxBytes);
      if (encoded) {
        return buildResult(attempt.image, encoded, originalBytes);
      }
    }

    const smallest = scaleImageToMaxWidth(ownedImages, image, FALLBACK_MAX_UPLOAD_WIDTH);
    const fallback = encodeNativeImageToJpeg(smallest, targetMaxBytes);
    if (!fallback) {
      return null;
    }

    return buildResult(smallest, fallback, originalBytes);
  } finally {
    destroyTrackedImages(ownedImages);
  }
}
