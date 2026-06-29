import { beforeEach, describe, expect, it } from "vitest";
import {
  applyEngagementPersistence,
  applyMinimumEngagementThreshold,
  clearEngagementPersistenceState,
  computeEngagedSecondsFromPolls,
  isFullMouseEngagementPoll,
  isKeyboardEngagementPoll,
  isMicroMouseEngagementPoll,
  MIN_ENGAGEMENT_RATIO,
  MOUSE_MICRO_MOVE_THRESHOLD_PX,
  setLastEngagementAtMsForTests
} from "./activity-engagement";
import { MOUSE_MOVE_THRESHOLD_PX } from "./mouse-activity-metrics";
import { computeEngagementActivityScore } from "./activity-score";

describe("activity-engagement", () => {
  beforeEach(() => {
    clearEngagementPersistenceState();
  });

  it("counts keyboard and full mouse as full engagement polls", () => {
    expect(isKeyboardEngagementPoll(1)).toBe(true);
    expect(isFullMouseEngagementPoll(MOUSE_MOVE_THRESHOLD_PX, 0, 0)).toBe(true);
    expect(isFullMouseEngagementPoll(0, 1, 0)).toBe(true);
    expect(isFullMouseEngagementPoll(0, 0, 1)).toBe(true);
  });

  it("counts micro movement between 4px and 12px as partial credit", () => {
    expect(isMicroMouseEngagementPoll(MOUSE_MICRO_MOVE_THRESHOLD_PX)).toBe(true);
    expect(isMicroMouseEngagementPoll(MOUSE_MOVE_THRESHOLD_PX - 1)).toBe(true);
    expect(isMicroMouseEngagementPoll(MOUSE_MOVE_THRESHOLD_PX)).toBe(false);

    const result = computeEngagedSecondsFromPolls(
      { pollCount: 15, pollsWithFullEngagement: 0, pollsWithMicroOnly: 10, pollsWithKeyboardHeld: 0 },
      15_000
    );
    expect(result.validEngagedSeconds).toBe(5);
  });

  it("union model yields higher score than keyboard/mouse average for typing-heavy work", () => {
    const engaged = computeEngagedSecondsFromPolls(
      { pollCount: 15, pollsWithFullEngagement: 12, pollsWithMicroOnly: 0, pollsWithKeyboardHeld: 12 },
      15_000
    );
    const score = computeEngagementActivityScore({
      validEngagedSeconds: engaged.validEngagedSeconds,
      trackedSeconds: 15
    });
    expect(score.activityScore).toBeGreaterThanOrEqual(75);
  });

  it("applies persistence floor when recently engaged and system still active", () => {
    const now = Date.now();
    setLastEngagementAtMsForTests(now - 20_000);

    const persisted = applyEngagementPersistence(0, 15, 12, now);
    expect(persisted).toBe(8.25);
  });

  it("does not apply persistence after 45s without engagement", () => {
    const now = Date.now();
    setLastEngagementAtMsForTests(now - 60_000);

    const persisted = applyEngagementPersistence(0, 15, 12, now);
    expect(persisted).toBe(0);
  });

  it("returns zero for truly idle windows", () => {
    const engaged = computeEngagedSecondsFromPolls(
      { pollCount: 15, pollsWithFullEngagement: 0, pollsWithMicroOnly: 0, pollsWithKeyboardHeld: 0 },
      15_000
    );
    expect(engaged.validEngagedSeconds).toBe(0);
    const score = computeEngagementActivityScore({
      validEngagedSeconds: 0,
      trackedSeconds: 15
    });
    expect(score.activityScore).toBe(0);
    expect(score.timelineColor).toBe("gray");
  });

  it("zeros engaged seconds at or below 5% of the window", () => {
    expect(applyMinimumEngagementThreshold(0.5, 15)).toBe(0);
    expect(applyMinimumEngagementThreshold(0.75, 15)).toBe(0);
  });

  it("keeps engaged seconds above 5% of the window", () => {
    expect(applyMinimumEngagementThreshold(1, 15)).toBe(1);
    expect(applyMinimumEngagementThreshold(5, 15)).toBe(5);
  });

  it("persistence floor still passes 5% threshold when applied after", () => {
    const now = Date.now();
    setLastEngagementAtMsForTests(now - 20_000);
    const persisted = applyEngagementPersistence(0, 15, 12, now);
    expect(persisted).toBe(8.25);
    expect(applyMinimumEngagementThreshold(persisted, 15)).toBe(8.25);
    expect(persisted / 15).toBeGreaterThan(MIN_ENGAGEMENT_RATIO);
  });
});
