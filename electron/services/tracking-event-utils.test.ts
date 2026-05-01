import { describe, expect, it } from "vitest";
import { buildTrackingMetadata, normalizeAppName } from "./tracking-event-utils";

describe("normalizeAppName", () => {
  it("maps known executables", () => {
    expect(normalizeAppName("chrome.exe")).toBe("chrome");
    expect(normalizeAppName("firefox.exe")).toBe("firefox");
    expect(normalizeAppName("msedge.exe")).toBe("edge");
    expect(normalizeAppName("code.exe")).toBe("vscode");
    expect(normalizeAppName("acad.exe")).toBe("autodesk");
    expect(normalizeAppName("AutodeskDesktopApp.exe")).toBe("autodesk");
  });
});

describe("buildTrackingMetadata", () => {
  it("guarantees required metadata keys", () => {
    const result = buildTrackingMetadata({
      source: "test",
      projectId: "p1",
      workDescription: "work",
      rawApplication: "chrome.exe",
      rawWindowTitle: "Docs",
      processName: "chrome.exe"
    });
    expect(result.metadata.application).toBe("chrome");
    expect(result.metadata.windowTitle).toBe("Docs");
    expect(result.metadata.rawApplication).toBe("chrome.exe");
    expect(result.metadata.rawWindowTitle).toBe("Docs");
    expect(result.metadata.mouseMovePercent).toBe(0);
    expect(result.metadata.totalSamples).toBe(0);
    expect(result.metadata.mouseMoveSamples).toBe(0);
    expect(result.metadata.trackerElapsedMs).toBe(0);
  });

  it("falls back for missing title/application", () => {
    const result = buildTrackingMetadata({
      source: "test",
      projectId: null,
      workDescription: null,
      rawApplication: "",
      rawWindowTitle: "",
      processName: ""
    });
    expect(result.metadata.application).toBe("unknown");
    expect(result.metadata.windowTitle).toBe("");
    expect(result.missingWindowTitle).toBe(true);
    expect(result.usedFallbackAppName).toBe(true);
  });
});
