export type InputActivitySampleRecord = {
  endedAtMs: number;
  mouseActiveSeconds: number;
  keyboardActiveSeconds: number;
  activeSeconds: number;
  windowSeconds: number;
};

const samples: InputActivitySampleRecord[] = [];
const MAX_SAMPLES = 2000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function clearInputActivityRollup(): void {
  samples.length = 0;
}

export function recordInputActivityRollupSample(input: {
  endedAtMs?: number;
  mouseActiveSeconds: number;
  keyboardActiveSeconds?: number;
  activeSeconds?: number;
  trackerElapsedMs: number;
}): void {
  const endedAtMs = input.endedAtMs ?? Date.now();
  samples.push({
    endedAtMs,
    mouseActiveSeconds: Math.max(0, input.mouseActiveSeconds),
    keyboardActiveSeconds: Math.max(0, input.keyboardActiveSeconds ?? 0),
    activeSeconds: Math.max(0, input.activeSeconds ?? 0),
    windowSeconds: Math.max(0.001, input.trackerElapsedMs / 1000)
  });

  const cutoff = endedAtMs - RETENTION_MS;
  while (samples.length > 0 && samples[0].endedAtMs < cutoff) {
    samples.shift();
  }
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export type PeriodMouseStats = {
  mouseMovePercent: number;
  mouseActiveSeconds: number;
  activityPeriodSeconds: number;
  activityPeriodStartAt: string;
  activityPeriodEndAt: string;
  sampleCount: number;
};

/** Mouse % for the interval ending at periodEndMs (e.g. last 10 minutes before a screenshot). */
export function getMouseStatsForPeriod(periodEndMs: number, periodMs: number): PeriodMouseStats {
  const periodSeconds = Math.max(0.001, periodMs / 1000);
  const periodStartMs = periodEndMs - periodMs;

  let mouseActiveSeconds = 0;
  let sampleCount = 0;
  for (const sample of samples) {
    if (sample.endedAtMs > periodStartMs && sample.endedAtMs <= periodEndMs + 1000) {
      mouseActiveSeconds += sample.mouseActiveSeconds;
      sampleCount += 1;
    }
  }

  const cappedMouseSeconds = Math.min(periodSeconds, mouseActiveSeconds);
  const mouseMovePercent = Number(
    Math.min(100, (cappedMouseSeconds / periodSeconds) * 100).toFixed(2)
  );

  return {
    mouseMovePercent,
    mouseActiveSeconds: Number(cappedMouseSeconds.toFixed(3)),
    activityPeriodSeconds: periodSeconds,
    activityPeriodStartAt: new Date(periodStartMs).toISOString(),
    activityPeriodEndAt: new Date(periodEndMs).toISOString(),
    sampleCount
  };
}
