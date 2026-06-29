import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSettings = new Map<string, string>();
const mockUserKey = { value: "user-1" as string | null };

vi.mock("./queue-repo", () => ({
  getSetting: (key: string) => mockSettings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    mockSettings.set(key, value);
  }
}));

vi.mock("./user-scope", () => ({
  getCurrentAppUserKey: () => mockUserKey.value
}));

vi.mock("./recent-tasks", () => ({
  getRecentWorkTasks: () => [],
  recordRecentWorkTask: vi.fn()
}));

vi.mock("../config/client-timezone", () => ({
  getClientIanaTimeZone: () => "UTC"
}));

import { getWorkSummary, resolveMirroredSessionStartedAt } from "./work-log";

describe("getWorkSummary overlap handling", () => {
  beforeEach(() => {
    mockSettings.clear();
    mockUserKey.value = "user-1";
  });

  it("counts overlapping completed segments once for today total", () => {
    mockSettings.set(
      "workLogEntries",
      JSON.stringify([
        {
          id: "a",
          userKey: "user-1",
          projectId: "p1",
          projectName: "Project A",
          description: "first",
          startedAt: "2026-06-23T10:00:00.000Z",
          stoppedAt: "2026-06-23T11:00:00.000Z",
          durationMs: 3_600_000
        },
        {
          id: "b",
          userKey: "user-1",
          projectId: "p1",
          projectName: "Project A",
          description: "overlap",
          startedAt: "2026-06-23T09:00:00.000Z",
          stoppedAt: "2026-06-23T12:00:00.000Z",
          durationMs: 10_800_000
        }
      ])
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T12:30:00.000Z"));

    const summary = getWorkSummary();
    expect(summary.todayTotalMs).toBe(3 * 3_600_000);
    expect(summary.todayByProject[0]?.totalMs).toBe(3 * 3_600_000);

    vi.useRealTimers();
  });

  it("merges live active time with completed segments for the same project", () => {
    mockSettings.set(
      "workLogEntries",
      JSON.stringify([
        {
          id: "a",
          userKey: "user-1",
          projectId: "p1",
          projectName: "Project A",
          description: "done",
          startedAt: "2026-06-23T10:00:00.000Z",
          stoppedAt: "2026-06-23T11:00:00.000Z",
          durationMs: 3_600_000
        }
      ])
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T11:30:00.000Z"));

    const summary = getWorkSummary({
      projectId: "p1",
      projectName: "Project A",
      startedAt: "2026-06-23T10:30:00.000Z"
    });

    expect(summary.todayTotalMs).toBe(90 * 60_000);
    expect(summary.todayByProject[0]?.totalMs).toBe(90 * 60_000);

    vi.useRealTimers();
  });
});

describe("resolveMirroredSessionStartedAt", () => {
  beforeEach(() => {
    mockSettings.clear();
    mockUserKey.value = "user-1";
  });

  it("keeps remote startedAt when there is no prior desktop segment today", () => {
    const remote = "2026-06-23T09:00:00.000Z";
    expect(resolveMirroredSessionStartedAt(remote, "p1", Date.parse("2026-06-23T11:00:00.000Z"))).toBe(
      remote
    );
  });

  it("does not backdate before the latest completed desktop segment", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T11:05:00.000Z"));

    mockSettings.set(
      "workLogEntries",
      JSON.stringify([
        {
          id: "a",
          userKey: "user-1",
          projectId: "p1",
          projectName: "Project A",
          description: "done",
          startedAt: "2026-06-23T10:00:00.000Z",
          stoppedAt: "2026-06-23T11:00:00.000Z",
          durationMs: 3_600_000
        }
      ])
    );

    const mirrorNowMs = Date.parse("2026-06-23T11:05:00.000Z");
    expect(
      resolveMirroredSessionStartedAt("2026-06-23T09:00:00.000Z", "p1", mirrorNowMs)
    ).toBe("2026-06-23T11:05:00.000Z");

    vi.useRealTimers();
  });
});
