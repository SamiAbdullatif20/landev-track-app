import { randomUUID } from "node:crypto";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { enqueueEvent, getSessionState } from "../db/queue-repo";
import { logger } from "../config/logger";
import { buildWorkSessionEventFields } from "./session-event-fields";
import {
  flushActivityIntervalTracker,
  type CompletedActivityInterval
} from "./activity-interval-tracker";

export async function recordActivityIntervalEvent(
  interval: CompletedActivityInterval
): Promise<boolean> {
  const state = getSessionState();
  if (!state.active) {
    return false;
  }

  const occurredAtIso = new Date(interval.intervalEndMs).toISOString();
  const sessionFields = buildWorkSessionEventFields(state, new Date(occurredAtIso));
  const eventUuid = randomUUID();

  const payload: Record<string, unknown> = {
    eventUuid,
    eventKind: "ACTIVITY_INTERVAL",
    type: "ACTIVITY_INTERVAL",
    occurredAt: occurredAtIso,
    occurredAtIso,
    ...sessionFields,
    intervalMinutes: interval.intervalMinutes,
    intervalStartAt: interval.intervalStartAt,
    intervalEndAt: interval.intervalEndAt,
    trackedSeconds: interval.trackedSeconds,
    activeSeconds: interval.activeSeconds,
    idleSeconds: interval.idleSeconds,
    validKeyboardSeconds: interval.validKeyboardSeconds,
    validMouseSeconds: interval.validMouseSeconds,
    validClickSeconds: interval.validClickSeconds,
    validEngagedSeconds: interval.validEngagedSeconds,
    keyboardActivityPercent: interval.keyboardActivityPercent,
    mouseActivityPercent: interval.mouseActivityPercent,
    clickActivityPercent: interval.clickActivityPercent,
    engagementActivityPercent: interval.engagementActivityPercent,
    activityScore: interval.activityScore,
    estimatedEfficiencyPercent: interval.estimatedEfficiencyPercent,
    activityLevel: interval.activityLevel,
    timelineColor: interval.timelineColor,
    metadata: {
      ...sessionFields,
      source: "tracking-activity-interval",
      intervalMinutes: interval.intervalMinutes,
      intervalStartAt: interval.intervalStartAt,
      intervalEndAt: interval.intervalEndAt,
      trackedSeconds: interval.trackedSeconds,
      activeSeconds: interval.activeSeconds,
      idleSeconds: interval.idleSeconds,
      validKeyboardSeconds: interval.validKeyboardSeconds,
      validMouseSeconds: interval.validMouseSeconds,
      validClickSeconds: interval.validClickSeconds,
      validEngagedSeconds: interval.validEngagedSeconds,
      keyboardActivityPercent: interval.keyboardActivityPercent,
      mouseActivityPercent: interval.mouseActivityPercent,
      clickActivityPercent: interval.clickActivityPercent,
      engagementActivityPercent: interval.engagementActivityPercent,
      activityScore: interval.activityScore,
      estimatedEfficiencyPercent: interval.estimatedEfficiencyPercent,
      activityLevel: interval.activityLevel,
      timelineColor: interval.timelineColor,
      antiCheatFlags: interval.antiCheatFlags,
      sampleCount: interval.sampleCount,
      clientTimeZone: interval.clientTimeZone ?? getClientIanaTimeZone()
    }
  };

  enqueueEvent("ACTIVITY_INTERVAL", payload);
  logger.info("activity-interval", {
    intervalStartAt: interval.intervalStartAt,
    activityScore: interval.activityScore,
    timelineColor: interval.timelineColor
  });
  return true;
}

export async function flushPendingActivityIntervals(): Promise<void> {
  const state = getSessionState();
  const segmentStartedAtMs = state.startedAt ? Date.parse(state.startedAt) : null;
  const interval = flushActivityIntervalTracker({
    segmentStartedAtMs: Number.isFinite(segmentStartedAtMs) ? segmentStartedAtMs : null
  });
  if (interval) {
    await recordActivityIntervalEvent(interval);
  }
}
