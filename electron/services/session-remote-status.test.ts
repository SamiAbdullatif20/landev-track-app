import { describe, expect, it } from "vitest";
import { parseRemoteSessionStatus } from "./session-remote-status";

describe("parseRemoteSessionStatus", () => {
  it("detects active workSession", () => {
    const status = parseRemoteSessionStatus({
      active: true,
      workSession: {
        id: "ws-1",
        projectId: "p-1",
        description: "Drawings",
        startedAt: "2026-06-18T10:00:00.000Z"
      }
    });
    expect(status?.active).toBe(true);
    expect(status?.sessionId).toBe("ws-1");
    expect(status?.projectId).toBe("p-1");
  });

  it("returns inactive when stopped", () => {
    const status = parseRemoteSessionStatus({
      workSession: {
        id: "ws-1",
        startedAt: "2026-06-18T10:00:00.000Z",
        stoppedAt: "2026-06-18T11:00:00.000Z"
      }
    });
    expect(status?.active).toBe(false);
  });

  it("handles empty payload", () => {
    expect(parseRemoteSessionStatus({ active: false })?.active).toBe(false);
  });
});
