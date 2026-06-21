import { getClientIanaTimeZone } from "../config/client-timezone";
import {
  ACTIVITY_INTERVAL_MINUTES,
  floorToFifteenMinuteIntervalStartMs,
  intervalEndMs
} from "../utils/activity-interval-time";
import {
  activityLevelFromScore,
  activityScoreFromPercents,
  estimatedEfficiencyPercent,
  percentFromSeconds,
  timelineColorFromScore,
  type ActivityLevel,
  type TimelineColor
} from "./activity-score";

export type ActivityIntervalSubsample = {
  endedAtMs: number;
  trackedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  validKeyboardSeconds: number;
  validMouseSeconds: number;
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
  keyboardActivityPercent: number;
  mouseActivityPercent: number;
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
  samples: ActivityIntervalSubsample[]
): CompletedActivityInterval | null {
  if (samples.length === 0) {
    return null;
  }

  const trackedSeconds = samples.reduce((sum, sample) => sum + sample.trackedSeconds, 0);
  if (trackedSeconds <= 0) {
    return null;
  }

  const activeSeconds = samples.reduce((sum, sample) => sum + sample.activeSeconds, 0);
  const idleSeconds = samples.reduce((sum, sample) => sum + sample.idleSeconds, 0);
  const validKeyboardSeconds = samples.reduce((sum, sample) => sum + sample.validKeyboardSeconds, 0);
  const validMouseSeconds = samples.reduce((sum, sample) => sum + sample.validMouseSeconds, 0);
  const keyboardActivityPercent = percentFromSeconds(validKeyboardSeconds, trackedSeconds);
  const mouseActivityPercent = percentFromSeconds(validMouseSeconds, trackedSeconds);
  const activityScore = activityScoreFromPercents(keyboardActivityPercent, mouseActivityPercent);
  const endMs = intervalEndMs(intervalStartMs);

  return {
    intervalStartMs,
    intervalEndMs: endMs,
    intervalStartAt: new Date(intervalStartMs).toISOString(),
    intervalEndAt: new Date(endMs).toISOString(),
    intervalMinutes: ACTIVITY_INTERVAL_MINUTES,
    trackedSeconds: Number(trackedSeconds.toFixed(3)),
    activeSeconds: Number(activeSeconds.toFixed(3)),
    idleSeconds: Number(idleSeconds.toFixed(3)),
    validKeyboardSeconds: Number(validKeyboardSeconds.toFixed(3)),
    validMouseSeconds: Number(validMouseSeconds.toFixed(3)),
    keyboardActivityPercent,
    mouseActivityPercent,
    activityScore,
    estimatedEfficiencyPercent: estimatedEfficiencyPercent(activeSeconds, trackedSeconds),
    activityLevel: activityLevelFromScore(activityScore),
    timelineColor: timelineColorFromScore(activityScore),
    antiCheatFlags: uniqueFlags(samples.flatMap((sample) => sample.antiCheatFlags)),
    sampleCount: samples.length,
    clientTimeZone: getClientIanaTimeZone()
  };
}

export function clearActivityIntervalTracker(): void {
  currentIntervalStartMs = null;
  subsamples = [];
}

export function ingestActivityIntervalSubsample(sample: ActivityIntervalSubsample): CompletedActivityInterval[] {
  const intervalStartMs = floorToFifteenMinuteIntervalStartMs(sample.endedAtMs);
  const completed: CompletedActivityInterval[] = [];

  if (currentIntervalStartMs !== null && intervalStartMs !== currentIntervalStartMs) {
    const finished = buildCompletedInterval(currentIntervalStartMs, subsamples);
    if (finished) {
      completed.push(finished);
    }
    subsamples = [];
  }

  currentIntervalStartMs = intervalStartMs;
  subsamples.push(sample);
  return completed;
}

export function flushActivityIntervalTracker(): CompletedActivityInterval | null {
  if (currentIntervalStartMs === null || subsamples.length === 0) {
    clearActivityIntervalTracker();
    return null;
  }

  const finished = buildCompletedInterval(currentIntervalStartMs, subsamples);
  clearActivityIntervalTracker();
  return finished;
}
