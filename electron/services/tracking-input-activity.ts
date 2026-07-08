import { randomUUID } from "node:crypto";
import { getClientIanaTimeZone } from "../config/client-timezone";
import type { SessionState } from "../db/index";
import { enqueueEvent, getSessionState } from "../db/queue-repo";
import { logger } from "../config/logger";
import { collectActivityContext } from "./activity-metadata";
import { buildWorkSessionEventFields } from "./session-event-fields";
import { buildTrackingMetadata } from "./tracking-event-utils";
import { applyAntiCheatFilter } from "./activity-anti-cheat";
import {
  adjustEngagedSecondsForAntiCheat,
  applyMinimumEngagementThreshold
} from "./activity-engagement";
import {
  computeEngagementActivityScore,
  computeSampleActivityScore,
  percentFromSeconds
} from "./activity-score";
import {
  ingestActivityIntervalSubsample,
  type ActivityIntervalSubsample
} from "./activity-interval-tracker";
import { recordActivityIntervalEvent } from "./tracking-activity-interval";
import {
  recordInputActivityRollupSample
} from "./input-activity-rollup";
import { QUEUE_INPUT_ACTIVITY_FOR_SYNC } from "./tracking-agent-flags";

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
  clickActivityPercent?: number;
  clickActiveSeconds?: number;
  clickSamples?: number;
  totalSamples?: number;
  triggerType?: string;
  pollTravelPx?: number[];
  validEngagedSeconds?: number;
  fullEngagementPolls?: number;
  microEngagementPolls?: number;
};

function shouldSkipAllZero(sample: InputActivitySample, eventKind: "INPUT_ACTIVITY" | "HEARTBEAT"): boolean {
  if ((sample.validEngagedSeconds ?? 0) > 0) {
    return false;
  }
  const noInput =
    sample.mouseMoveCount <= 0 &&
    sample.keyPressCount <= 0 &&
    (sample.clickCount ?? 0) <= 0 &&
    (sample.scrollCount ?? 0) <= 0;
  const noActiveTime = sample.activeSeconds <= 0;
  if (!noInput || !noActiveTime) {
    return false;
  }
  return eventKind === "INPUT_ACTIVITY";
}

export async function recordInputActivityEvent(
  sample: InputActivitySample,
  sessionState?: SessionState
): Promise<boolean> {
  const state = sessionState ?? getSessionState();
  if (!sessionState && !state.active) {
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
  const activeSeconds = Math.max(0, sample.activeSeconds);
  const idleSeconds = Math.max(0, sample.idleSeconds);
  const mouseActiveSeconds =
    typeof sample.mouseActiveSeconds === "number"
      ? Math.min(windowSeconds, Math.max(0, sample.mouseActiveSeconds))
      : mouseMoveSamples;
  const mouseMovePercent =
    typeof sample.mouseMovePercent === "number"
      ? Math.min(100, Math.max(0, Number(sample.mouseMovePercent.toFixed(2))))
      : Number(((mouseActiveSeconds / windowSeconds) * 100).toFixed(2));
  const clickSamples = Math.min(totalSamples, Math.max(0, sample.clickSamples ?? 0));
  const clickActiveSeconds =
    typeof sample.clickActiveSeconds === "number"
      ? Math.min(windowSeconds, Math.max(0, sample.clickActiveSeconds))
      : clickSamples;

  const antiCheat = applyAntiCheatFilter({
    mouseMoveCount: sample.mouseMoveCount,
    keyPressCount: sample.keyPressCount,
    clickCount: sample.clickCount ?? 0,
    scrollCount: sample.scrollCount ?? 0,
    mouseActiveSeconds,
    clickActiveSeconds,
    activeSeconds: sample.activeSeconds,
    windowSeconds,
    pollTravelPx: sample.pollTravelPx
  });

  let validEngagedSeconds = Math.min(
    windowSeconds,
    Math.max(0, sample.validEngagedSeconds ?? 0)
  );
  validEngagedSeconds = adjustEngagedSecondsForAntiCheat(
    validEngagedSeconds,
    antiCheat.flags,
    windowSeconds
  );
  validEngagedSeconds = applyMinimumEngagementThreshold(validEngagedSeconds, windowSeconds);

  const breakdownMetrics = computeSampleActivityScore({
    validKeyboardSeconds: antiCheat.validKeyboardSeconds,
    validMouseSeconds: antiCheat.validMouseSeconds,
    trackedSeconds: windowSeconds
  });
  const engagementMetrics = computeEngagementActivityScore({
    validEngagedSeconds,
    trackedSeconds: windowSeconds
  });
  const clickActivityPercent = percentFromSeconds(antiCheat.validClickSeconds, windowSeconds);
  const estimatedEfficiencyPercent = Number(
    ((activeSeconds / windowSeconds) * 100).toFixed(2)
  );

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
    clickCount: sample.clickCount ?? 0,
    scrollCount: sample.scrollCount ?? 0,
    mouseMovePercent: built.metadata.mouseMovePercent,
    mouseActiveSeconds,
    clickActiveSeconds: antiCheat.validClickSeconds,
    activeSeconds,
    idleSeconds,
    validEngagedSeconds,
    engagementActivityPercent: engagementMetrics.engagementActivityPercent,
    keyboardActivityPercent: breakdownMetrics.keyboardActivityPercent,
    mouseActivityPercent: breakdownMetrics.mouseActivityPercent,
    clickActivityPercent,
    activityScore: engagementMetrics.activityScore,
    estimatedEfficiencyPercent,
    activityLevel: engagementMetrics.activityLevel,
    timelineColor: engagementMetrics.timelineColor,
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
      clickActiveSeconds: antiCheat.validClickSeconds,
      clickSamples,
      activeSeconds,
      idleSeconds,
      validEngagedSeconds,
      engagementActivityPercent: engagementMetrics.engagementActivityPercent,
      fullEngagementPolls: sample.fullEngagementPolls ?? 0,
      microEngagementPolls: sample.microEngagementPolls ?? 0,
      validKeyboardSeconds: antiCheat.validKeyboardSeconds,
      validMouseSeconds: antiCheat.validMouseSeconds,
      validClickSeconds: antiCheat.validClickSeconds,
      keyboardActivityPercent: breakdownMetrics.keyboardActivityPercent,
      mouseActivityPercent: breakdownMetrics.mouseActivityPercent,
      clickActivityPercent,
      activityScore: engagementMetrics.activityScore,
      estimatedEfficiencyPercent,
      activityLevel: engagementMetrics.activityLevel,
      timelineColor: engagementMetrics.timelineColor,
      antiCheatFlags: antiCheat.flags,
      trackerElapsedMs: sample.trackerElapsedMs,
      clientTimeZone: getClientIanaTimeZone(),
      hasForegroundWindowHandle: Boolean(context.hasForegroundWindowHandle),
      windowReasonCode: context.windowReasonCode ?? null
    }
  };

  if (QUEUE_INPUT_ACTIVITY_FOR_SYNC) {
    enqueueEvent(eventKind, payload);
  }

  recordInputActivityRollupSample({
    endedAtMs: Date.parse(occurredAtIso),
    mouseActiveSeconds: antiCheat.validMouseSeconds,
    keyboardActiveSeconds: antiCheat.validKeyboardSeconds,
    activeSeconds: sample.activeSeconds,
    validEngagedSeconds,
    trackerElapsedMs: sample.trackerElapsedMs
  });

  const intervalSubsample: ActivityIntervalSubsample = {
    endedAtMs: Date.parse(occurredAtIso),
    trackedSeconds: windowSeconds,
    activeSeconds: sample.activeSeconds,
    idleSeconds: sample.idleSeconds,
    validEngagedSeconds,
    validKeyboardSeconds: antiCheat.validKeyboardSeconds,
    validMouseSeconds: antiCheat.validMouseSeconds,
    validClickSeconds: antiCheat.validClickSeconds,
    antiCheatFlags: antiCheat.flags
  };
  const segmentStartedAtMs = state.startedAt ? Date.parse(state.startedAt) : null;
  const completedIntervals = ingestActivityIntervalSubsample(intervalSubsample, {
    segmentStartedAtMs: Number.isFinite(segmentStartedAtMs) ? segmentStartedAtMs : null
  });
  if (QUEUE_INPUT_ACTIVITY_FOR_SYNC) {
    for (const interval of completedIntervals) {
      await recordActivityIntervalEvent(interval);
    }
  }

  if (QUEUE_INPUT_ACTIVITY_FOR_SYNC) {
    logger.info("input-activity-sample", payload);
  } else {
    logger.debug("input-activity-sample-local-only", {
      eventKind,
      mouseMoveCount: sample.mouseMoveCount,
      keyPressCount: sample.keyPressCount,
      clickCount: sample.clickCount ?? 0,
      queued: false
    });
  }
  return true;
}
