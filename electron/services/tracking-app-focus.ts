import { randomUUID } from "node:crypto";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { enqueueEvent, getSessionState } from "../db/queue-repo";
import { logger } from "../config/logger";
import { buildWorkSessionEventFields } from "./session-event-fields";
import type { ActivityContext } from "./activity-metadata";
import { collectActivityContext } from "./activity-metadata";
import { detectMeetingOrCallPresence } from "./meeting-detection";
import {
  buildTrackingMetadata,
  formatProcessNameForPayload
} from "./tracking-event-utils";

const TRACKER_PROCESS_KEYS = new Set(["electron", "landev-track-app", "landev tracker"]);

const IGNORED_FOREGROUND_PROCESS_KEYS = new Set([
  "powershell",
  "pwsh",
  "cmd",
  "conhost",
  "windowspowershell",
  "openconsole",
  "wt"
]);
const recentTickSignatures = new Map<string, number>();

export type AppFocusTriggerType = "foreground_change" | "foreground_tick";

export type RecordAppFocusOptions = {
  activeSeconds: number;
  source: string;
  triggerType: AppFocusTriggerType;
  /** When Landev is foreground, pass last known non-tracker context. */
  context?: ActivityContext;
  trackerElapsedMs?: number;
};

export function isTrackerProcess(processName: string): boolean {
  const key = processName.trim().toLowerCase().replace(/\.exe$/, "");
  if (TRACKER_PROCESS_KEYS.has(key)) {
    return true;
  }
  return key.includes("landev") && key.includes("track");
}

export function isTrackerContext(context: ActivityContext): boolean {
  const processKey = (context.processName ?? context.application ?? context.appName ?? "").trim();
  return Boolean(processKey && isTrackerProcess(processKey));
}

function processKeyFromContext(context: ActivityContext): string {
  const fromName = (context.processName ?? context.application ?? context.appName ?? "").trim();
  const fromPath = context.executablePath?.trim().split(/[/\\]/).pop()?.trim() ?? "";
  return (fromName || fromPath).toLowerCase().replace(/\.exe$/, "");
}

export function isIgnoredForegroundContext(context: ActivityContext): boolean {
  const key = processKeyFromContext(context);
  return Boolean(key && IGNORED_FOREGROUND_PROCESS_KEYS.has(key));
}

export function hasForegroundAppSignal(context: ActivityContext): boolean {
  const title = (context.windowTitle ?? context.activeWindowTitle ?? "").trim();
  return Boolean(processKeyFromContext(context) || title);
}

export function isReportableForegroundContext(context: ActivityContext): boolean {
  if (!hasForegroundAppSignal(context)) {
    return false;
  }
  return !isTrackerContext(context) && !isIgnoredForegroundContext(context);
}

export function focusSignature(context: ActivityContext): string {
  const process = (context.processName ?? context.application ?? "").trim().toLowerCase();
  const title = (context.windowTitle ?? context.activeWindowTitle ?? "").trim().toLowerCase();
  return `${process}|${title}`;
}

export function clearAppFocusDedupeState(): void {
  recentTickSignatures.clear();
}

function shouldDedupeTick(signature: string): boolean {
  const lastSeenMs = recentTickSignatures.get(signature);
  const nowMs = Date.now();
  if (lastSeenMs && nowMs - lastSeenMs <= 5000) {
    return true;
  }
  recentTickSignatures.set(signature, nowMs);
  for (const [key, value] of Array.from(recentTickSignatures.entries())) {
    if (nowMs - value > 60_000) {
      recentTickSignatures.delete(key);
    }
  }
  return false;
}

export function buildAppFocusPayload(
  state: ReturnType<typeof getSessionState>,
  context: ActivityContext,
  options: RecordAppFocusOptions
): Record<string, unknown> | null {
  if (!isReportableForegroundContext(context)) {
    return null;
  }

  const activeSeconds = Math.max(0, options.activeSeconds);
  const trackerElapsedMs = Math.max(
    0,
    options.trackerElapsedMs ?? Math.round(activeSeconds * 1000)
  );
  if (activeSeconds <= 0 && trackerElapsedMs <= 0) {
    return null;
  }

  const processName = formatProcessNameForPayload(
    context.processName ?? context.appName ?? context.application ?? "",
    context.executablePath
  );
  const built = buildTrackingMetadata({
    source: options.source,
    projectId: state.projectId,
    workDescription: state.description,
    trackerElapsedMs,
    rawApplication: context.application ?? context.appName ?? context.processName,
    rawWindowTitle: context.windowTitle ?? context.activeWindowTitle,
    processName,
    application: context.application ?? context.appName,
    windowTitle: context.windowTitle ?? context.activeWindowTitle
  });

  const meetingPresence = detectMeetingOrCallPresence(context);
  let idleSeconds = 0;
  let resolvedActiveSeconds = activeSeconds;
  if (meetingPresence.treatIntervalAsFullActiveWork) {
    resolvedActiveSeconds = Math.max(resolvedActiveSeconds, activeSeconds);
    idleSeconds = 0;
  }

  const occurredAtIso = new Date().toISOString();
  const sessionFields = buildWorkSessionEventFields(state, new Date(occurredAtIso));
  const eventUuid = randomUUID();

  return {
    eventUuid,
    eventKind: "APP_FOCUS",
    type: "APP_FOCUS",
    occurredAt: occurredAtIso,
    occurredAtIso,
    ...sessionFields,
    appName: built.metadata.applicationDisplayName,
    application: built.metadata.application,
    applicationDisplayName: built.metadata.applicationDisplayName,
    processName,
    windowTitle: built.metadata.windowTitle,
    activeSeconds: resolvedActiveSeconds,
    idleSeconds,
    metadata: {
      ...built.metadata,
      ...sessionFields,
      executablePath: context.executablePath ?? null,
      processId: context.processId ?? null,
      activeSeconds: resolvedActiveSeconds,
      idleSeconds,
      trackerElapsedMs,
      triggerType: options.triggerType,
      hasForegroundWindowHandle: Boolean(context.hasForegroundWindowHandle),
      windowReasonCode: context.windowReasonCode ?? null,
      clientTimeZone: getClientIanaTimeZone(),
      ...(meetingPresence.treatIntervalAsFullActiveWork
        ? {
            meetingPresenceOverride: true,
            meetingPresenceReason: meetingPresence.reason
          }
        : {})
    }
  };
}

export async function recordAppFocusEvent(options: RecordAppFocusOptions): Promise<boolean> {
  const state = getSessionState();
  if (!state.active) {
    return false;
  }

  const context = options.context ?? await collectActivityContext();
  if (!isReportableForegroundContext(context)) {
    return false;
  }

  if (options.triggerType === "foreground_tick") {
    const signature = focusSignature(context);
    if (shouldDedupeTick(signature)) {
      return false;
    }
  }

  const payload = buildAppFocusPayload(state, context, options);
  if (!payload) {
    return false;
  }

  enqueueEvent("APP_FOCUS", payload);
  logger.info("app-focus-sample", payload);
  return true;
}
