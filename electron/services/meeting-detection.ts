import type { ActivityContext } from "./activity-metadata";

export type MeetingPresenceResult = {
  treatIntervalAsFullActiveWork: boolean;
  reason: string | null;
};

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

function teamsWindowLooksLikeMeetingOrCall(title: string, proc: string, exe: string): boolean {
  const isTeamsProcess = proc.includes("teams") || exe.includes("\\teams.exe") || exe.includes("ms-teams");
  if (!isTeamsProcess) {
    return false;
  }

  // Common Teams title layout: "… | Meeting | Microsoft Teams" or "… | Call | Microsoft Teams"
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
  // Teams in Edge/Chrome often shows "… | Microsoft Teams" without a URL in the title
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

  // Teams on the web often includes these hosts in the title or tab text
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

  if (proc.includes("zoom") || exe.endsWith("\\zoom.exe") || exe.includes("zoom.exe")) {
    return { treatIntervalAsFullActiveWork: true, reason: "zoom_foreground" };
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
