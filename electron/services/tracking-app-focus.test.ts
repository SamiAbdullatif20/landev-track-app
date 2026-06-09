import { describe, expect, it } from "vitest";
import {
  buildAppFocusPayload,
  focusSignature,
  isIgnoredForegroundContext,
  isReportableForegroundContext,
  isTrackerContext
} from "./tracking-app-focus";
import { formatProcessNameForPayload } from "./tracking-event-utils";
import type { ActivityContext } from "./activity-metadata";

const sessionState = {
  id: 1,
  active: 1,
  sessionId: "ws-abc-123",
  projectId: "proj-1",
  description: "Site work",
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function chromeContext(): ActivityContext {
  return {
    platform: "win32",
    collectedAt: new Date().toISOString(),
    application: "chrome",
    appName: "chrome",
    processName: "chrome",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    windowTitle: "Landev Dashboard - Google Chrome",
    activeWindowTitle: "Landev Dashboard - Google Chrome",
    hasForegroundWindowHandle: true,
    windowReasonCode: null
  };
}

function autocadContext(): ActivityContext {
  return {
    platform: "win32",
    collectedAt: new Date().toISOString(),
    application: "acad",
    appName: "acad",
    processName: "acad",
    executablePath: "C:\\Program Files\\Autodesk\\AutoCAD 2024\\acad.exe",
    windowTitle: "Drawing1.dwg - AutoCAD 2024",
    activeWindowTitle: "Drawing1.dwg - AutoCAD 2024",
    hasForegroundWindowHandle: true,
    windowReasonCode: null
  };
}

describe("APP_FOCUS payloads", () => {
  it("builds Chrome example for Apps used panel", () => {
    const payload = buildAppFocusPayload(sessionState, chromeContext(), {
      activeSeconds: 15,
      source: "test",
      triggerType: "foreground_tick",
      trackerElapsedMs: 15_000
    });
    expect(payload).not.toBeNull();
    expect(payload?.eventKind).toBe("APP_FOCUS");
    expect(payload?.workSessionId).toBe("ws-abc-123");
    expect(payload?.projectId).toBe("proj-1");
    expect(payload?.appName).toBe("Chrome");
    expect(payload?.processName).toBe("chrome.exe");
    expect(payload?.windowTitle).toBe("Landev Dashboard - Google Chrome");
    expect((payload?.metadata as Record<string, unknown>).application).toBe("chrome");
    expect((payload?.metadata as Record<string, unknown>).executablePath).toContain("chrome.exe");
  });

  it("builds AutoCAD example with acad.exe and drawing title", () => {
    const payload = buildAppFocusPayload(sessionState, autocadContext(), {
      activeSeconds: 15,
      source: "test",
      triggerType: "foreground_change",
      trackerElapsedMs: 15_000
    });
    expect(payload).not.toBeNull();
    expect(payload?.eventKind).toBe("APP_FOCUS");
    expect(payload?.appName).toBe("AutoCAD");
    expect(payload?.processName).toBe("acad.exe");
    expect(payload?.windowTitle).toContain("AutoCAD");
    expect((payload?.metadata as Record<string, unknown>).application).toBe("autodesk");
    expect((payload?.metadata as Record<string, unknown>).applicationDisplayName).toBe("AutoCAD");
  });

  it("skips PowerShell from Apps used", () => {
    const powershell: ActivityContext = {
      platform: "win32",
      collectedAt: new Date().toISOString(),
      application: "powershell",
      processName: "powershell",
      windowTitle: "",
      hasForegroundWindowHandle: true
    };
    expect(isIgnoredForegroundContext(powershell)).toBe(true);
    expect(isReportableForegroundContext(powershell)).toBe(false);
    expect(
      buildAppFocusPayload(sessionState, powershell, {
        activeSeconds: 15,
        source: "test",
        triggerType: "foreground_change"
      })
    ).toBeNull();
  });

  it("skips Landev tracker when no sticky context is provided", () => {
    const tracker: ActivityContext = {
      platform: "win32",
      collectedAt: new Date().toISOString(),
      application: "electron",
      processName: "electron",
      windowTitle: "LANDEV Tracker",
      hasForegroundWindowHandle: true
    };
    expect(isTrackerContext(tracker)).toBe(true);
    expect(buildAppFocusPayload(sessionState, tracker, {
      activeSeconds: 15,
      source: "test",
      triggerType: "foreground_tick"
    })).toBeNull();
    expect(focusSignature(autocadContext())).toContain("acad");
  });

  it("formats Revit.exe from executable path", () => {
    expect(
      formatProcessNameForPayload("Revit", "C:\\Program Files\\Autodesk\\Revit 2024\\Revit.exe")
    ).toBe("Revit.exe");
  });
});
