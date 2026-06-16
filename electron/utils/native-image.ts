import type { NativeImage } from "electron";

/** Release Chromium native image memory when supported by the runtime. */
export function releaseNativeImage(image: NativeImage): void {
  const disposable = image as NativeImage & { destroy?: () => void };
  try {
    disposable.destroy?.();
  } catch {
    // Best-effort cleanup.
  }
}
