import { describe, expect, it } from "vitest";
import {
  activityLevelFromScore,
  activityScoreFromPercents,
  computeEngagementActivityScore,
  estimatedEfficiencyPercent,
  timelineColorFromScore
} from "./activity-score";

describe("activity-score", () => {
  it("averages keyboard and mouse percents into activity score", () => {
    expect(activityScoreFromPercents(80, 40)).toBe(60);
    expect(activityScoreFromPercents(0, 0)).toBe(0);
  });

  it("maps Traqq color bands", () => {
    expect(timelineColorFromScore(75)).toBe("green");
    expect(timelineColorFromScore(50)).toBe("orange");
    expect(timelineColorFromScore(20)).toBe("red");
    expect(timelineColorFromScore(0)).toBe("gray");
  });

  it("maps activity levels from score", () => {
    expect(activityLevelFromScore(80)).toBe("high");
    expect(activityLevelFromScore(45)).toBe("medium");
    expect(activityLevelFromScore(10)).toBe("low");
    expect(activityLevelFromScore(0)).toBe("idle");
  });

  it("computes estimated efficiency from active vs tracked time", () => {
    expect(estimatedEfficiencyPercent(450, 900)).toBe(50);
    expect(estimatedEfficiencyPercent(0, 900)).toBe(0);
  });

  it("scores timeline from union engaged seconds", () => {
    const result = computeEngagementActivityScore({
      validEngagedSeconds: 12,
      trackedSeconds: 15
    });
    expect(result.activityScore).toBe(80);
    expect(result.engagementActivityPercent).toBe(80);
    expect(result.timelineColor).toBe("green");
  });
});
