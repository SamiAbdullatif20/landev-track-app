import { beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";

vi.mock("../config/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import {
  hasOneTimeLocalTrackingResetApplied,
  resetLocalTrackingData,
  runOneTimeLocalTrackingResetIfNeeded
} from "./local-tracking-reset";

type MockDbState = {
  active: number;
  sessionId: string | null;
  queueCount: number;
  settings: Map<string, string>;
};

function createMockDb(state: MockDbState): Database.Database {
  return {
    exec: (sql: string) => {
      if (sql.includes("UPDATE active_session")) {
        state.active = 0;
        state.sessionId = null;
      }
      if (sql.includes("DELETE FROM queued_events")) {
        state.queueCount = 0;
      }
      if (sql.includes("DELETE FROM app_settings")) {
        for (const key of Array.from(state.settings.keys())) {
          if (
            key === "workLogEntries"
            || key === "activeSessionProjectName"
            || key === "activeSessionIsNonChargeable"
            || key === "activeSessionOwnerUserKey"
            || key.startsWith("recentWorkTasks:")
          ) {
            state.settings.delete(key);
          }
        }
      }
    },
    prepare: (sql: string) => ({
      get: (params?: { key?: string }) => {
        if (sql.includes("SELECT value FROM app_settings")) {
          const key = params?.key;
          const value = key ? state.settings.get(key) : undefined;
          return value === undefined ? undefined : { value };
        }
        return undefined;
      },
      run: (params?: { key?: string; updatedAt?: string }) => {
        if (sql.includes("INSERT INTO app_settings") && params?.key) {
          state.settings.set(params.key, "true");
        }
      }
    })
  } as unknown as Database.Database;
}

describe("local-tracking-reset", () => {
  let state: MockDbState;

  beforeEach(() => {
    state = {
      active: 1,
      sessionId: "sess-1",
      queueCount: 2,
      settings: new Map([
        ["workLogEntries", '[{"id":"1"}]'],
        ["currentAppUserKey", "demo1"],
        ["recentWorkTasks:demo1", "[]"]
      ])
    };
  });

  it("clears local tracking data but keeps login user key", () => {
    const db = createMockDb(state);
    resetLocalTrackingData(db);

    expect(state.active).toBe(0);
    expect(state.sessionId).toBeNull();
    expect(state.queueCount).toBe(0);
    expect(state.settings.has("workLogEntries")).toBe(false);
    expect(state.settings.get("currentAppUserKey")).toBe("demo1");
  });

  it("runs only once per machine", () => {
    const db = createMockDb(state);
    expect(runOneTimeLocalTrackingResetIfNeeded(db)).toBe(true);
    expect(hasOneTimeLocalTrackingResetApplied(db)).toBe(true);

    state.settings.set("workLogEntries", '[{"id":"2"}]');
    expect(runOneTimeLocalTrackingResetIfNeeded(db)).toBe(false);
    expect(state.settings.has("workLogEntries")).toBe(true);
  });
});
