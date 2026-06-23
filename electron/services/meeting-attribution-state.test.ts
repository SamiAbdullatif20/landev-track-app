import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMeetingAttributionState,
  consumeMeetingAttributionWindow,
  recordMeetingAttributionPoll,
  resolveCurrentMeetingPresence,
  setBackgroundMeetingPresence
} from "./meeting-attribution-state";
import type { ActivityContext } from "./activity-metadata";

function ctx(partial: Partial<ActivityContext>): ActivityContext {
  return {
    platform: "win32",
    collectedAt: new Date().toISOString(),
    ...partial
  };
}

describe("meeting-attribution-state", () => {
  beforeEach(() => {
    clearMeetingAttributionState();
  });

  it("uses background meeting when foreground is another app", () => {
    setBackgroundMeetingPresence({
      treatIntervalAsFullActiveWork: true,
      reason: "background_zoom_meeting_window"
    });

    const snapshot = resolveCurrentMeetingPresence(
      ctx({ processName: "AutoCAD", windowTitle: "Drawing1.dwg" })
    );

    expect(snapshot.inMeeting).toBe(true);
    expect(snapshot.source).toBe("background");
  });

  it("counts meeting seconds across polls", () => {
    setBackgroundMeetingPresence({
      treatIntervalAsFullActiveWork: true,
      reason: "background_zoom_meeting_window"
    });

    for (let i = 0; i < 10; i += 1) {
      recordMeetingAttributionPoll(ctx({ processName: "chrome", windowTitle: "Docs" }));
    }

    const sample = consumeMeetingAttributionWindow(15_000, 1_000);
    expect(sample.meetingAttributedSeconds).toBe(10);
    expect(sample.isMeetingActive).toBe(true);
  });

  it("prefers foreground meeting over idle background", () => {
    recordMeetingAttributionPoll(
      ctx({ processName: "Zoom", windowTitle: "Weekly sync - Zoom Meeting" })
    );

    const sample = consumeMeetingAttributionWindow(15_000, 1_000);
    expect(sample.meetingAttributedSeconds).toBe(1);
    expect(sample.meetingDetectionSource).toBe("foreground");
  });
});
