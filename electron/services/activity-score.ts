export type ActivityLevel = "high" | "medium" | "low" | "idle";
export type TimelineColor = "green" | "orange" | "red" | "gray";

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 100) {
    return 100;
  }
  return Number(value.toFixed(2));
}

export function percentFromSeconds(numeratorSeconds: number, denominatorSeconds: number): number {
  if (denominatorSeconds <= 0) {
    return 0;
  }
  return clampPercent((numeratorSeconds / denominatorSeconds) * 100);
}

/** Traqq-style score: average of valid keyboard % and valid mouse % for the window. */
export function activityScoreFromPercents(keyboardPercent: number, mousePercent: number): number {
  return Math.round((clampPercent(keyboardPercent) + clampPercent(mousePercent)) / 2);
}

/** Active time ÷ tracked time × 100 */
export function estimatedEfficiencyPercent(activeSeconds: number, trackedSeconds: number): number {
  return percentFromSeconds(activeSeconds, trackedSeconds);
}

export function activityLevelFromScore(score: number): ActivityLevel {
  if (score <= 0) {
    return "idle";
  }
  if (score >= 60) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
}

export function timelineColorFromScore(score: number): TimelineColor {
  switch (activityLevelFromScore(score)) {
    case "high":
      return "green";
    case "medium":
      return "orange";
    case "low":
      return "red";
    default:
      return "gray";
  }
}

export function computeSampleActivityScore(input: {
  validKeyboardSeconds: number;
  validMouseSeconds: number;
  trackedSeconds: number;
}): {
  keyboardActivityPercent: number;
  mouseActivityPercent: number;
  activityScore: number;
  activityLevel: ActivityLevel;
  timelineColor: TimelineColor;
} {
  const keyboardActivityPercent = percentFromSeconds(
    input.validKeyboardSeconds,
    input.trackedSeconds
  );
  const mouseActivityPercent = percentFromSeconds(input.validMouseSeconds, input.trackedSeconds);
  const activityScore = activityScoreFromPercents(keyboardActivityPercent, mouseActivityPercent);

  return {
    keyboardActivityPercent,
    mouseActivityPercent,
    activityScore,
    activityLevel: activityLevelFromScore(activityScore),
    timelineColor: timelineColorFromScore(activityScore)
  };
}
