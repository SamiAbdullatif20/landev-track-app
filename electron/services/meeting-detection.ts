import type { ActivityContext } from "./activity-metadata";
import { probeMeetingWindowContexts } from "./meeting-window-probe-windows";

export type MeetingPresenceResult = {
  treatIntervalAsFullActiveWork: boolean;
  reason: string | null;
};

const ZOOM_NON_MEETING_TITLE_PARTS = [
  "zoom workplace",
  "sign in",
  "sign-in",
  "settings",
  "preferences",
  "about zoom",
  "zoom launcher",
  "join a meeting",
  "join meeting - zoom",
  "schedule meeting",
  "profile"
] as const;

const ZOOM_MEETING_TITLE_PARTS = [
  "zoom meeting",
  "sharing",
  "share screen",
  "share preview",
  "you are sharing",
  "screen share",
  "webinar",
  "waiting room",
  "breakout",
  "passcode",
  "meeting controls",
  "floating meeting controls"
] as const;

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function isZoomProcess(proc: string, exe: string): boolean {
  return proc.includes("zoom") || exe.endsWith("\\zoom.exe") || exe.includes("zoom.exe");
}

export function zoomWindowLooksLikeActiveMeeting(title: string): boolean {
  const t = norm(title);
  if (!t) {
    return false;
  }
  if (ZOOM_NON_MEETING_TITLE_PARTS.some((part) => t.includes(part))) {
    return false;
  }
  if (ZOOM_MEETING_TITLE_PARTS.some((part) => t.includes(part))) {
    return true;
  }
  // Active calls often use the meeting topic as the window title.
  return t.length > 0;
}

function teamsWindowLooksLikeMeetingOrCall(title: string, proc: string, exe: string): boolean {
  const isTeamsProcess = proc.includes("teams") || exe.includes("\\teams.exe") || exe.includes("ms-teams");
  if (!isTeamsProcess) {
    return false;
  }

  if (/\|\s*(meeting|call|live event|webinar|town hall|broadcast)\s*\|/i.test(title)) {
    return true;
  }

  if (
    /\b(in a call|in a meeting|on a call|incoming call|outgoing call|call ringing|calling you|join the meeting|join meeting)\b/i.test(
      title
    )
  ) {
    return true;
  }

  if (/\b(screen sharing|sharing (your|their) screen|presenting|present your|you're presenting)\b/i.test(title)) {
    return true;
  }

  if (
    /\b(meeting|webinar|town hall|live event|video call|phone call|calling)\b/i.test(title)
    || /\bcall with\b/i.test(title)
    || /\bjoin\b.*\bmeeting\b/i.test(title)
  ) {
    return true;
  }

  if (/\b(waiting in the lobby|breakout room|rejoin (the )?meeting)\b/i.test(title)) {
    return true;
  }

  return false;
}

function browserMeetingFromTitle(title: string): boolean {
  if (/\bmicrosoft teams\b/.test(title) && /\b(meeting|call|webinar|live event)\b/i.test(title)) {
    return true;
  }

  if (
    title.includes("google meet")
    || title.includes("meet.google.com")
    || title.includes("zoom meeting")
    || title.includes("zoom webinar")
    || title.includes("meet.jit.si")
    || title.includes("jitsi meet")
    || title.includes("whereby")
    || title.includes("daily.co")
    || title.includes("gather.town")
    || title.includes("around.co")
  ) {
    return true;
  }

  if (title.includes("teams.live.com") || title.includes("teams.microsoft.com")) {
    if (/\b(meeting|call|webinar|live event|join)\b/i.test(title)) {
      return true;
    }
  }

  return false;
}

/**
 * When the user is in a video/voice meeting they often do not move the mouse.
 * If the foreground window looks like a meeting client, count the whole telemetry
 * interval as active work (idleSeconds forced to 0 for that event).
 */
export function detectMeetingOrCallPresence(context: ActivityContext): MeetingPresenceResult {
  const proc = norm(context.processName ?? context.application ?? context.appName);
  const title = norm(context.windowTitle ?? context.activeWindowTitle);
  const exe = norm(context.executablePath);

  if (isZoomProcess(proc, exe)) {
    if (zoomWindowLooksLikeActiveMeeting(title)) {
      return { treatIntervalAsFullActiveWork: true, reason: "zoom_meeting_window" };
    }
    return { treatIntervalAsFullActiveWork: false, reason: null };
  }

  if (proc.includes("webex") || title.includes("webex")) {
    return { treatIntervalAsFullActiveWork: true, reason: "webex" };
  }

  if (proc.includes("g2m") || proc.includes("gotomeeting") || title.includes("gotomeeting")) {
    return { treatIntervalAsFullActiveWork: true, reason: "goto_meeting" };
  }

  if (teamsWindowLooksLikeMeetingOrCall(title, proc, exe)) {
    return { treatIntervalAsFullActiveWork: true, reason: "teams_meeting_or_call" };
  }

  if (browserMeetingFromTitle(title)) {
    return { treatIntervalAsFullActiveWork: true, reason: "browser_meeting_title" };
  }

  if (proc.includes("slack")) {
    if (
      title.includes("huddle")
      || /\bslack huddle\b/i.test(title)
      || /\bslack call\b/i.test(title)
      || /\bcall\s*—/i.test(title)
    ) {
      return { treatIntervalAsFullActiveWork: true, reason: "slack_call_or_huddle" };
    }
  }

  if (proc.includes("discord")) {
    if (/\bvoice\b/i.test(title) && title.includes("#")) {
      return { treatIntervalAsFullActiveWork: true, reason: "discord_voice_channel" };
    }
  }

  if (proc.includes("skype") || proc.includes("viber") || proc.includes("facetime")) {
    return { treatIntervalAsFullActiveWork: true, reason: "legacy_call_app" };
  }

  return { treatIntervalAsFullActiveWork: false, reason: null };
}

/** Scan all top-level windows for an active meeting (covers Zoom share + work in another app). */
export async function detectBackgroundMeetingPresence(): Promise<MeetingPresenceResult> {
  if (process.platform !== "win32") {
    return { treatIntervalAsFullActiveWork: false, reason: null };
  }

  const windows = await probeMeetingWindowContexts();
  for (const context of windows) {
    const presence = detectMeetingOrCallPresence(context);
    if (presence.treatIntervalAsFullActiveWork) {
      return { treatIntervalAsFullActiveWork: true, reason: `background_${presence.reason}` };
    }
  }

  return { treatIntervalAsFullActiveWork: false, reason: null };
}
