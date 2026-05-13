import { describe, expect, it } from "vitest";
import { detectMeetingOrCallPresence } from "./meeting-detection";
import type { ActivityContext } from "./activity-metadata";

function ctx(partial: Partial<ActivityContext>): ActivityContext {
  return {
    platform: "win32",
    collectedAt: new Date().toISOString(),
    ...partial
  };
}

describe("detectMeetingOrCallPresence", () => {
  it("detects Zoom by process name", () => {
    const r = detectMeetingOrCallPresence(ctx({ processName: "Zoom", windowTitle: "Meeting" }));
    expect(r.treatIntervalAsFullActiveWork).toBe(true);
    expect(r.reason).toBe("zoom_foreground");
  });

  it("detects Google Meet in browser title", () => {
    const r = detectMeetingOrCallPresence(
      ctx({ processName: "chrome", windowTitle: "Standup - Google Meet" })
    );
    expect(r.treatIntervalAsFullActiveWork).toBe(true);
    expect(r.reason).toBe("browser_meeting_title");
  });

  it("detects Teams only when title suggests meeting/call", () => {
    expect(
      detectMeetingOrCallPresence(ctx({ processName: "Teams", windowTitle: "Chat | Contoso | Microsoft Teams" }))
        .treatIntervalAsFullActiveWork
    ).toBe(false);

    expect(
      detectMeetingOrCallPresence(
        ctx({ processName: "Teams", windowTitle: "Weekly sync meeting - Microsoft Teams" })
      ).treatIntervalAsFullActiveWork
    ).toBe(true);
  });

  it("detects Slack huddle", () => {
    const r = detectMeetingOrCallPresence(
      ctx({ processName: "slack", windowTitle: "Huddle: design - Acme - Slack" })
    );
    expect(r.treatIntervalAsFullActiveWork).toBe(true);
    expect(r.reason).toBe("slack_call_or_huddle");
  });

  it("detects Teams when title has Meeting segment between pipes", () => {
    const r = detectMeetingOrCallPresence(
      ctx({
        processName: "Teams",
        windowTitle: "Weekly sync | Meeting | Microsoft Teams"
      })
    );
    expect(r.treatIntervalAsFullActiveWork).toBe(true);
    expect(r.reason).toBe("teams_meeting_or_call");
  });

  it("detects Jitsi / Meet in browser title", () => {
    const r = detectMeetingOrCallPresence(
      ctx({ processName: "chrome", windowTitle: "standup - meet.jit.si" })
    );
    expect(r.treatIntervalAsFullActiveWork).toBe(true);
    expect(r.reason).toBe("browser_meeting_title");
  });

  it("detects Teams in browser from title", () => {
    const r = detectMeetingOrCallPresence(
      ctx({ processName: "msedge", windowTitle: "Design review | Meeting | Microsoft Teams" })
    );
    expect(r.treatIntervalAsFullActiveWork).toBe(true);
    expect(r.reason).toBe("browser_meeting_title");
  });
});
