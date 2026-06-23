import { logger } from "../config/logger";
import { getSessionState } from "../db/queue-repo";
import { InputActivityCounter } from "./input-activity-counter";
import {
  computeClickActivityPercent,
  computeMouseMovePercent,
  cursorTravelPx,
  isClickActivePoll,
  isMouseActivePoll
} from "./mouse-activity-metrics";
import {
  applyEngagementPersistence,
  computeEngagedSecondsFromPolls,
  isFullMouseEngagementPoll,
  isKeyboardEngagementPoll,
  isMicroMouseEngagementPoll
} from "./activity-engagement";
import { probeWindowsInputSnapshot } from "./input-probe-windows";
import {
  consumeMeetingAttributionWindow,
  recordMeetingAttributionPoll,
  refreshBackgroundMeetingPresence
} from "./meeting-attribution-state";
import { recordInputActivityEvent } from "./tracking-input-activity";

export const INPUT_ACTIVITY_SAMPLE_MS = 15_000;
export const INPUT_ACTIVITY_POLL_MS = 1_000;

export class InputActivitySampler {
  private pollTimer: NodeJS.Timeout | null = null;
  private sampleTimer: NodeJS.Timeout | null = null;
  private readonly counter = new InputActivityCounter();
  private lastIdleMs = 0;
  private pollCount = 0;
  private pollsWithSignificantMovement = 0;
  private pollsWithClicks = 0;
  private pollsWithFullEngagement = 0;
  private pollsWithMicroOnly = 0;
  private pollsWithKeyboardHeld = 0;
  private maxIdleMsInWindow = 0;
  private lastSampleX: number | null = null;
  private lastSampleY: number | null = null;
  private pollTravelPx: number[] = [];
  private runGeneration = 0;

  start(): void {
    if (this.sampleTimer) {
      return;
    }
    this.runGeneration += 1;
    this.pollCount = 0;
    this.pollsWithSignificantMovement = 0;
    this.pollsWithClicks = 0;
    this.pollsWithFullEngagement = 0;
    this.pollsWithMicroOnly = 0;
    this.pollsWithKeyboardHeld = 0;
    this.maxIdleMsInWindow = 0;
    this.lastSampleX = null;
    this.lastSampleY = null;
    this.pollTravelPx = [];
    this.lastIdleMs = 0;

    logger.info("input-activity-sampler-started", {
      sampleMs: INPUT_ACTIVITY_SAMPLE_MS,
      pollMs: INPUT_ACTIVITY_POLL_MS
    });

    this.pollTimer = setInterval(() => void this.pollOnce(), INPUT_ACTIVITY_POLL_MS);
    this.sampleTimer = setInterval(() => void this.emitSample("interval"), INPUT_ACTIVITY_SAMPLE_MS);
    void this.pollOnce();
    void this.emitSample("session_start");
  }

  stop(): void {
    this.runGeneration += 1;
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info("input-activity-sampler-stopped");
  }

  private isRunActive(runId: number): boolean {
    return runId === this.runGeneration && getSessionState().active === 1;
  }

  private async pollOnce(): Promise<void> {
    const runId = this.runGeneration;
    if (!this.isRunActive(runId)) {
      return;
    }
    const snapshot = await probeWindowsInputSnapshot();
    if (!this.isRunActive(runId) || !snapshot) {
      return;
    }
    this.pollCount += 1;
    this.maxIdleMsInWindow = Math.max(this.maxIdleMsInWindow, snapshot.idleMs);
    const travelPx =
      this.lastSampleX !== null && this.lastSampleY !== null
        ? cursorTravelPx(this.lastSampleX, this.lastSampleY, snapshot.x, snapshot.y)
        : 0;
    if (isMouseActivePoll(travelPx, snapshot.scrollCount)) {
      this.pollsWithSignificantMovement += 1;
    }
    if (isClickActivePoll(snapshot.clickCount)) {
      this.pollsWithClicks += 1;
    }
    const keysDownCount = snapshot.keysDown.length;
    if (isKeyboardEngagementPoll(keysDownCount)) {
      this.pollsWithKeyboardHeld += 1;
    }
    const hasFullMouse = isFullMouseEngagementPoll(
      travelPx,
      snapshot.scrollCount,
      snapshot.clickCount
    );
    const hasKeyboard = isKeyboardEngagementPoll(keysDownCount);
    if (hasKeyboard || hasFullMouse) {
      this.pollsWithFullEngagement += 1;
    } else if (isMicroMouseEngagementPoll(travelPx)) {
      this.pollsWithMicroOnly += 1;
    }
    if (travelPx > 0) {
      this.pollTravelPx.push(travelPx);
    }
    this.lastSampleX = snapshot.x;
    this.lastSampleY = snapshot.y;
    this.lastIdleMs = snapshot.idleMs;
    this.counter.ingest(snapshot);
    recordMeetingAttributionPoll();
  }

  private async emitSample(triggerType: string): Promise<void> {
    const runId = this.runGeneration;
    if (!this.isRunActive(runId)) {
      return;
    }

    await this.pollOnce();
    if (!this.isRunActive(runId)) {
      return;
    }

    await refreshBackgroundMeetingPresence();

    const drained = this.counter.drain();
    const windowMs = INPUT_ACTIVITY_SAMPLE_MS;
    const idleMs = Math.min(windowMs, this.maxIdleMsInWindow);
    let activeMs = Math.max(0, windowMs - idleMs);
    const meetingAttribution = consumeMeetingAttributionWindow(windowMs, INPUT_ACTIVITY_POLL_MS);
    if (meetingAttribution.meetingAttributedSeconds > 0) {
      activeMs = Math.max(activeMs, Math.round(meetingAttribution.meetingAttributedSeconds * 1000));
    }
    const activeSeconds = Number((Math.min(windowMs, activeMs) / 1000).toFixed(3));
    const idleSeconds = Number(((windowMs - Math.min(windowMs, activeMs)) / 1000).toFixed(3));

    const { mouseMovePercent, mouseMoveSamples, totalSamples, mouseActiveSeconds } =
      computeMouseMovePercent(
        {
          pollCount: this.pollCount,
          pollsWithSignificantMovement: this.pollsWithSignificantMovement
        },
        windowMs
      );
    const { clickActivityPercent, clickSamples, clickActiveSeconds } = computeClickActivityPercent(
      {
        pollCount: this.pollCount,
        pollsWithClicks: this.pollsWithClicks
      },
      windowMs
    );
    const savedPollCount = this.pollCount;
    const savedFullEngagement = this.pollsWithFullEngagement;
    const savedMicroOnly = this.pollsWithMicroOnly;
    const savedKeyboardHeld = this.pollsWithKeyboardHeld;

    this.pollCount = 0;
    this.pollsWithSignificantMovement = 0;
    this.pollsWithClicks = 0;
    this.pollsWithFullEngagement = 0;
    this.pollsWithMicroOnly = 0;
    this.pollsWithKeyboardHeld = 0;
    this.maxIdleMsInWindow = 0;
    const pollTravelPx = this.pollTravelPx;
    this.pollTravelPx = [];

    const windowSeconds = windowMs / 1000;
    const engagedFromPolls = computeEngagedSecondsFromPolls(
      {
        pollCount: savedPollCount,
        pollsWithFullEngagement: savedFullEngagement,
        pollsWithMicroOnly: savedMicroOnly,
        pollsWithKeyboardHeld: savedKeyboardHeld
      },
      windowMs,
      INPUT_ACTIVITY_POLL_MS
    );
    let validEngagedSeconds = applyEngagementPersistence(
      engagedFromPolls.validEngagedSeconds,
      windowSeconds,
      activeSeconds,
      Date.now()
    );
    if (meetingAttribution.meetingAttributedSeconds > 0) {
      validEngagedSeconds = Math.max(
        validEngagedSeconds,
        Math.min(windowSeconds, meetingAttribution.meetingAttributedSeconds)
      );
    }

    await recordInputActivityEvent({
      mouseMoveCount: drained.mouseMoveCount,
      keyPressCount: drained.keyPressCount,
      clickCount: drained.clickCount,
      scrollCount: drained.scrollCount,
      activeSeconds,
      idleSeconds,
      trackerElapsedMs: windowMs,
      totalSamples,
      mouseMoveSamples,
      mouseMovePercent,
      mouseActiveSeconds,
      clickActivityPercent,
      clickActiveSeconds,
      clickSamples,
      pollTravelPx,
      meetingAttributedSeconds: meetingAttribution.meetingAttributedSeconds,
      meetingPollSamples: meetingAttribution.meetingPollSamples,
      isMeetingActive: meetingAttribution.isMeetingActive,
      meetingPresenceReason: meetingAttribution.meetingPresenceReason,
      meetingDetectionSource: meetingAttribution.meetingDetectionSource,
      validEngagedSeconds,
      fullEngagementPolls: engagedFromPolls.fullEngagementPolls,
      microEngagementPolls: engagedFromPolls.microEngagementPolls,
      triggerType
    });
  }
}
