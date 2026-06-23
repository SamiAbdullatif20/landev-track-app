import { getClientIanaTimeZone } from "../config/client-timezone";
import {
  ACTIVITY_INTERVAL_MINUTES,
  floorToFifteenMinuteIntervalStartMs,
  intervalEndMs
} from "../utils/activity-interval-time";
import {
  activityLevelFromScore,
  estimatedEfficiencyPercent,
  percentFromSeconds,
  timelineColorFromScore,
  type ActivityLevel,
  type TimelineColor
} from "./activity-score";
import {
  effectiveActivityIntervalStartMs,
  filterSubsamplesForSessionSegment
} from "./batch-event-payload";

export type ActivityIntervalSubsample = {
  endedAtMs: number;
  trackedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  validEngagedSeconds: number;
  validKeyboardSeconds: number;
  validMouseSeconds: number;
  validClickSeconds: number;
  antiCheatFlags: string[];
};

export type CompletedActivityInterval = {
  intervalStartMs: number;
  intervalEndMs: number;
  intervalStartAt: string;
  intervalEndAt: string;
  intervalMinutes: number;
  trackedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  validKeyboardSeconds: number;
  validMouseSeconds: number;
  validClickSeconds: number;
  validEngagedSeconds: number;
  keyboardActivityPercent: number;
  mouseActivityPercent: number;
  clickActivityPercent: number;
  engagementActivityPercent: number;
  activityScore: number;
  estimatedEfficiencyPercent: number;
  activityLevel: ActivityLevel;
  timelineColor: TimelineColor;
  antiCheatFlags: string[];
  sampleCount: number;
  clientTimeZone: string;
};

let currentIntervalStartMs: number | null = null;
let subsamples: ActivityIntervalSubsample[] = [];

function uniqueFlags(flags: string[]): string[] {
  return Array.from(new Set(flags));
}

function buildCompletedInterval(
  intervalStartMs: number,
  samples: ActivityIntervalSubsample[],
  segmentStartedAtMs?: number | null
): CompletedActivityInterval | null {
  const scopedSamples = filterSubsamplesForSessionSegment(samples, segmentStartedAtMs);
  if (scopedSamples.length === 0) {
    return null;
  }

  const effectiveStartMs = effectiveActivityIntervalStartMs(intervalStartMs, segmentStartedAtMs);
  const trackedSeconds = scopedSamples.reduce((sum, sample) => sum + sample.trackedSeconds, 0);
  if (trackedSeconds <= 0) {
    return null;
  }

  const activeSeconds = scopedSamples.reduce((sum, sample) => sum + sample.activeSeconds, 0);
  const idleSeconds = scopedSamples.reduce((sum, sample) => sum + sample.idleSeconds, 0);
  const validKeyboardSeconds = scopedSamples.reduce((sum, sample) => sum + sample.validKeyboardSeconds, 0);
  const validMouseSeconds = scopedSamples.reduce((sum, sample) => sum + sample.validMouseSeconds, 0);
  const validClickSeconds = scopedSamples.reduce((sum, sample) => sum + sample.validClickSeconds, 0);
  const validEngagedSeconds = scopedSamples.reduce((sum, sample) => sum + sample.validEngagedSeconds, 0);
  const keyboardActivityPercent = percentFromSeconds(validKeyboardSeconds, trackedSeconds);
  const mouseActivityPercent = percentFromSeconds(validMouseSeconds, trackedSeconds);
  const clickActivityPercent = percentFromSeconds(validClickSeconds, trackedSeconds);
  const engagementActivityPercent = percentFromSeconds(validEngagedSeconds, trackedSeconds);
  const activityScore = Math.round(engagementActivityPercent);
  const endMs = intervalEndMs(intervalStartMs);

  return {
    intervalStartMs: effectiveStartMs,
    intervalEndMs: endMs,
    intervalStartAt: new Date(effectiveStartMs).toISOString(),
    intervalEndAt: new Date(endMs).toISOString(),
    intervalMinutes: ACTIVITY_INTERVAL_MINUTES,
    trackedSeconds: Number(trackedSeconds.toFixed(3)),
    activeSeconds: Number(activeSeconds.toFixed(3)),
    idleSeconds: Number(idleSeconds.toFixed(3)),
    validKeyboardSeconds: Number(validKeyboardSeconds.toFixed(3)),
    validMouseSeconds: Number(validMouseSeconds.toFixed(3)),
    validClickSeconds: Number(validClickSeconds.toFixed(3)),
    validEngagedSeconds: Number(validEngagedSeconds.toFixed(3)),
    keyboardActivityPercent,
    mouseActivityPercent,
    clickActivityPercent,
    engagementActivityPercent,
    activityScore,
    estimatedEfficiencyPercent: estimatedEfficiencyPercent(activeSeconds, trackedSeconds),
    activityLevel: activityLevelFromScore(activityScore),
    timelineColor: timelineColorFromScore(activityScore),
    antiCheatFlags: uniqueFlags(scopedSamples.flatMap((sample) => sample.antiCheatFlags)),
    sampleCount: scopedSamples.length,
    clientTimeZone: getClientIanaTimeZone()
  };
}

export function clearActivityIntervalTracker(): void {
  currentIntervalStartMs = null;
  subsamples = [];
}

export type ActivityIntervalTrackerOptions = {
  segmentStartedAtMs?: number | null;
};

export function ingestActivityIntervalSubsample(
  sample: ActivityIntervalSubsample,
  options?: ActivityIntervalTrackerOptions
): CompletedActivityInterval[] {
  const segmentStartedAtMs = options?.segmentStartedAtMs ?? null;
  const intervalStartMs = floorToFifteenMinuteIntervalStartMs(sample.endedAtMs);
  const completed: CompletedActivityInterval[] = [];

  if (currentIntervalStartMs !== null && intervalStartMs !== currentIntervalStartMs) {
    const finished = buildCompletedInterval(currentIntervalStartMs, subsamples, segmentStartedAtMs);
    if (finished) {
      completed.push(finished);
    }
    subsamples = [];
  }

  currentIntervalStartMs = intervalStartMs;
  subsamples.push(sample);
  return completed;
}

export function flushActivityIntervalTracker(
  options?: ActivityIntervalTrackerOptions
): CompletedActivityInterval | null {
  const segmentStartedAtMs = options?.segmentStartedAtMs ?? null;
  if (currentIntervalStartMs === null || subsamples.length === 0) {
    clearActivityIntervalTracker();
    return null;
  }

  const finished = buildCompletedInterval(currentIntervalStartMs, subsamples, segmentStartedAtMs);
  clearActivityIntervalTracker();
  return finished;
}
