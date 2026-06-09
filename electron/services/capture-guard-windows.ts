import { collectActivityContext } from "./activity-metadata";

export type CaptureGuardResult = {
  shouldSkipCapture: boolean;
  reason: string | null;
  processName: string | null;
  windowTitle: string | null;
};

function norm(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export async function shouldSkipScreenshotCapture(): Promise<CaptureGuardResult> {
  if (process.platform !== "win32") {
    return { shouldSkipCapture: false, reason: null, processName: null, windowTitle: null };
  }

  const ctx = await collectActivityContext();
  const processName = norm(ctx.processName ?? ctx.appName ?? ctx.application);
  const title = norm(ctx.windowTitle ?? ctx.activeWindowTitle);

  const snippingProcess = processName.includes("snippingtool") || processName.includes("screenclippinghost");
  const snippingTitle = title.includes("snipping tool") || title.includes("snip & sketch") || title.includes("screen clipping");
  if (snippingProcess || snippingTitle) {
    return {
      shouldSkipCapture: true,
      reason: "snipping_tool_active",
      processName: processName || null,
      windowTitle: title || null
    };
  }

  const recordingProcess = processName.includes("obs")
    || processName.includes("camtasia")
    || processName.includes("sharex")
    || processName.includes("xsplit")
    || processName.includes("bandicam");
  const recordingTitle = /\b(recording|screen record|capturing screen|capture in progress)\b/i.test(title);
  if (recordingProcess || recordingTitle) {
    return {
      shouldSkipCapture: true,
      reason: "screen_recording_active",
      processName: processName || null,
      windowTitle: title || null
    };
  }

  return { shouldSkipCapture: false, reason: null, processName: processName || null, windowTitle: title || null };
}
