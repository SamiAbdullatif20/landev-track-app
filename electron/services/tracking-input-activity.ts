import { randomUUID } from "node:crypto";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { enqueueEvent, getSessionState } from "../db/queue-repo";
import { logger } from "../config/logger";
import { collectActivityContext } from "./activity-metadata";
import { buildWorkSessionEventFields } from "./session-event-fields";
import { buildTrackingMetadata } from "./tracking-event-utils";
import {
  recordInputActivityRollupSample
} from "./input-activity-rollup";

export type InputActivitySample = {
  mouseMoveCount: number;
  keyPressCount: number;
  clickCount?: number;
  scrollCount?: number;
  activeSeconds: number;
  idleSeconds: number;
  trackerElapsedMs: number;
  mouseMovePercent?: number;
  mouseMoveSamples?: number;
  mouseActiveSeconds?: number;
  totalSamples?: number;
  triggerType?: string;
};

function shouldSkipAllZero(sample: InputActivitySample, eventKind: "INPUT_ACTIVITY" | "HEARTBEAT"): boolean {
  const noInput = sample.mouseMoveCount <= 0 && sample.keyPressCount <= 0;
  const noActiveTime = sample.activeSeconds <= 0;
  if (!noInput || !noActiveTime) {
    return false;
  }
  return eventKind === "INPUT_ACTIVITY";
}

export async function recordInputActivityEvent(sample: InputActivitySample): Promise<boolean> {
  const state = getSessionState();
  if (!state.active) {
    return false;
  }

  const eventKind: "INPUT_ACTIVITY" | "HEARTBEAT" =
    sample.triggerType === "heartbeat" ? "HEARTBEAT" : "INPUT_ACTIVITY";
  if (shouldSkipAllZero(sample, eventKind)) {
    return false;
  }

  const context = await collectActivityContext();
  const occurredAtIso = new Date().toISOString();
  const sessionFields = buildWorkSessionEventFields(state, new Date(occurredAtIso));
  const eventUuid = randomUUID();
  const totalSamples = Math.max(1, sample.totalSamples ?? 1);
  const mouseMoveSamples = Math.min(totalSamples, Math.max(0, sample.mouseMoveSamples ?? 0));
  const windowSeconds = Math.max(0.001, sample.trackerElapsedMs / 1000);
  const mouseActiveSeconds =
    typeof sample.mouseActiveSeconds === "number"
      ? Math.min(windowSeconds, Math.max(0, sample.mouseActiveSeconds))
      : mouseMoveSamples;
  const mouseMovePercent =
    typeof sample.mouseMovePercent === "number"
      ? Math.min(100, Math.max(0, Number(sample.mouseMovePercent.toFixed(2))))
      : Number(((mouseActiveSeconds / windowSeconds) * 100).toFixed(2));

  const built = buildTrackingMetadata({
    source: "tracking-input-activity",
    projectId: state.projectId,
    workDescription: state.description,
    mouseMovePercent,
    totalSamples,
    mouseMoveSamples,
    mouseActiveSeconds,
    trackerElapsedMs: sample.trackerElapsedMs,
    rawApplication: context.application ?? context.appName ?? context.processName,
    rawWindowTitle: context.windowTitle ?? context.activeWindowTitle,
    processName: context.processName ?? context.appName,
    application: context.application ?? context.appName,
    windowTitle: context.windowTitle ?? context.activeWindowTitle
  });

  const payload: Record<string, unknown> = {
    eventUuid,
    eventKind,
    type: eventKind,
    occurredAt: occurredAtIso,
    occurredAtIso,
    ...sessionFields,
    mouseMoveCount: sample.mouseMoveCount,
    keyPressCount: sample.keyPressCount,
    scrollCount: sample.scrollCount ?? 0,
    mouseMovePercent: built.metadata.mouseMovePercent,
    mouseActiveSeconds,
    activeSeconds: sample.activeSeconds,
    idleSeconds: sample.idleSeconds,
    trackerElapsedMs: sample.trackerElapsedMs,
    application: built.metadata.application,
    processName: built.metadata.processName,
    windowTitle: built.metadata.windowTitle,
    metadata: {
      ...built.metadata,
      ...sessionFields,
      triggerType: sample.triggerType ?? "interval_sample",
      clickCount: sample.clickCount ?? 0,
      scrollCount: sample.scrollCount ?? 0,
      mouseMoveCount: sample.mouseMoveCount,
      keyPressCount: sample.keyPressCount,
      mouseActiveSeconds,
      activeSeconds: sample.activeSeconds,
      idleSeconds: sample.idleSeconds,
      trackerElapsedMs: sample.trackerElapsedMs,
      clientTimeZone: getClientIanaTimeZone(),
      hasForegroundWindowHandle: Boolean(context.hasForegroundWindowHandle),
      windowReasonCode: context.windowReasonCode ?? null
    }
  };

  enqueueEvent(eventKind, payload);
  recordInputActivityRollupSample({
    endedAtMs: Date.parse(occurredAtIso),
    mouseActiveSeconds,
    trackerElapsedMs: sample.trackerElapsedMs
  });
  logger.info("input-activity-sample", payload);
  return true;
}
