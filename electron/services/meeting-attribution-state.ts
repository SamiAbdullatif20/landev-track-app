import type { ActivityContext } from "./activity-metadata";
import {
  detectBackgroundMeetingPresence,
  detectMeetingOrCallPresence,
  type MeetingPresenceResult
} from "./meeting-detection";

export type MeetingAttributionSnapshot = {
  inMeeting: boolean;
  reason: string | null;
  source: "foreground" | "background" | null;
};

let backgroundPresence: MeetingPresenceResult = {
  treatIntervalAsFullActiveWork: false,
  reason: null
};
let lastForegroundContext: ActivityContext | null = null;
let meetingPollCount = 0;
let attributionPollCount = 0;
let lastSnapshot: MeetingAttributionSnapshot = {
  inMeeting: false,
  reason: null,
  source: null
};

export function setBackgroundMeetingPresence(presence: MeetingPresenceResult): void {
  backgroundPresence = presence;
}

export function updateForegroundContextForMeeting(context: ActivityContext | null): void {
  lastForegroundContext = context;
}

export function resolveCurrentMeetingPresence(
  foreground: ActivityContext | null = lastForegroundContext
): MeetingAttributionSnapshot {
  if (foreground) {
    const fg = detectMeetingOrCallPresence(foreground);
    if (fg.treatIntervalAsFullActiveWork) {
      return { inMeeting: true, reason: fg.reason, source: "foreground" };
    }
  }
  if (backgroundPresence.treatIntervalAsFullActiveWork) {
    return {
      inMeeting: true,
      reason: backgroundPresence.reason,
      source: "background"
    };
  }
  return { inMeeting: false, reason: null, source: null };
}

export function recordMeetingAttributionPoll(
  foreground: ActivityContext | null = lastForegroundContext
): void {
  attributionPollCount += 1;
  const snapshot = resolveCurrentMeetingPresence(foreground);
  lastSnapshot = snapshot;
  if (snapshot.inMeeting) {
    meetingPollCount += 1;
  }
}

export function consumeMeetingAttributionWindow(
  windowMs: number,
  pollIntervalMs: number
): {
  meetingAttributedSeconds: number;
  meetingPollSamples: number;
  totalPollSamples: number;
  meetingPresenceReason: string | null;
  meetingDetectionSource: "foreground" | "background" | null;
  isMeetingActive: boolean;
} {
  const windowSeconds = Math.max(0.001, windowMs / 1000);
  const pollSeconds = Math.max(0.001, pollIntervalMs / 1000);
  const totalPollSamples = Math.max(1, attributionPollCount);
  const meetingPollSamples = Math.min(totalPollSamples, Math.max(0, meetingPollCount));
  const meetingAttributedSeconds = Number(
    Math.min(windowSeconds, meetingPollSamples * pollSeconds).toFixed(3)
  );

  const result = {
    meetingAttributedSeconds,
    meetingPollSamples,
    totalPollSamples,
    meetingPresenceReason: lastSnapshot.reason,
    meetingDetectionSource: lastSnapshot.source,
    isMeetingActive: meetingAttributedSeconds > 0
  };

  meetingPollCount = 0;
  attributionPollCount = 0;
  return result;
}

export async function refreshBackgroundMeetingPresence(): Promise<MeetingPresenceResult> {
  const presence = await detectBackgroundMeetingPresence();
  backgroundPresence = presence;
  return presence;
}

export function clearMeetingAttributionState(): void {
  backgroundPresence = { treatIntervalAsFullActiveWork: false, reason: null };
  lastForegroundContext = null;
  meetingPollCount = 0;
  attributionPollCount = 0;
  lastSnapshot = { inMeeting: false, reason: null, source: null };
}
