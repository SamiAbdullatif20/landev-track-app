import { describe, expect, it } from "vitest";
import {
  delayMsUntilEarlierTarget,
  designerIntervalMs,
  initialDesignerTargetMs,
  initialSuperadminTargetMs,
  schedulesDueAtElapsed,
  SESSION_START_SCREENSHOT_DELAY_MS,
  SCREENSHOT_INTERVAL_MINUTES,
  SCREENSHOT_SCHEDULES,
  superadminIntervalMs
} from "./screenshot-schedules";

describe("screenshot schedules", () => {
  it("defines 20-minute admin-only and 30-minute employee-visible tiers", () => {
    expect(SCREENSHOT_INTERVAL_MINUTES.superadminOnly).toBe(20);
    expect(SCREENSHOT_INTERVAL_MINUTES.superadminAndDesigner).toBe(30);
    expect(SCREENSHOT_SCHEDULES).toHaveLength(2);

    const adminOnly = SCREENSHOT_SCHEDULES.find((s) => s.visibility === "superadmin_only");
    const staffVisible = SCREENSHOT_SCHEDULES.find((s) => s.visibility === "admin_and_employee");

    expect(adminOnly?.intervalMs).toBe(20 * 60 * 1000);
    expect(adminOnly?.visibleToRoles).toEqual(["SUPER_ADMIN"]);
    expect(staffVisible?.intervalMs).toBe(30 * 60 * 1000);
    expect(staffVisible?.visibleToRoles).toEqual(["SUPER_ADMIN", "DESIGNER", "MODERATOR"]);
  });

  it("uses independent 20m and 30m first-capture targets", () => {
    expect(initialSuperadminTargetMs()).toBe(superadminIntervalMs());
    expect(initialDesignerTargetMs()).toBe(designerIntervalMs());
    expect(superadminIntervalMs()).toBe(20 * 60 * 1000);
    expect(designerIntervalMs()).toBe(30 * 60 * 1000);
  });

  it("schedules delay to whichever tier fires next", () => {
    const minute = 60 * 1000;
    const startedAt = 1_000_000;

    expect(
      delayMsUntilEarlierTarget(startedAt, 6 * minute, 10 * minute, null, startedAt)
    ).toBe(6 * minute);

    expect(
      delayMsUntilEarlierTarget(startedAt, 12 * minute, 10 * minute, null, startedAt + 6 * minute)
    ).toBe(4 * minute);

    expect(
      delayMsUntilEarlierTarget(startedAt, 10 * minute, 10 * minute, null, startedAt + 8 * minute)
    ).toBe(2 * minute);
  });

  it("schedules bootstrap capture at 1 minute when pending", () => {
    const minute = 60 * 1000;
    const startedAt = 1_000_000;

    expect(
      delayMsUntilEarlierTarget(
        startedAt,
        20 * minute,
        30 * minute,
        SESSION_START_SCREENSHOT_DELAY_MS,
        startedAt
      )
    ).toBe(minute);

    expect(
      delayMsUntilEarlierTarget(
        startedAt,
        20 * minute,
        30 * minute,
        SESSION_START_SCREENSHOT_DELAY_MS,
        startedAt + 30_000
      )
    ).toBe(30_000);
  });

  it("prioritizes employee-visible capture when 6m and 10m tiers overlap", () => {
    const minute = 60 * 1000;
    const due = schedulesDueAtElapsed(10 * minute, 6 * minute, 10 * minute);
    expect(due).toHaveLength(1);
    expect(due[0]?.visibility).toBe("admin_and_employee");
  });

  it("returns only superadmin tier when only 6m is due", () => {
    const minute = 60 * 1000;
    const due = schedulesDueAtElapsed(6 * minute, 6 * minute, 10 * minute);
    expect(due).toHaveLength(1);
    expect(due[0]?.visibility).toBe("superadmin_only");
  });
});
