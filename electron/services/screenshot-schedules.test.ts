import { describe, expect, it } from "vitest";
import {
  delayMsUntilEarlierTarget,
  designerIntervalMs,
  initialDesignerTargetMs,
  initialSuperadminTargetMs,
  schedulesDueAtElapsed,
  SCREENSHOT_INTERVAL_MINUTES,
  SCREENSHOT_SCHEDULES,
  superadminIntervalMs
} from "./screenshot-schedules";

describe("screenshot schedules", () => {
  it("defines 6-minute admin-only and 10-minute employee-visible tiers", () => {
    expect(SCREENSHOT_INTERVAL_MINUTES.superadminOnly).toBe(6);
    expect(SCREENSHOT_INTERVAL_MINUTES.superadminAndDesigner).toBe(10);
    expect(SCREENSHOT_SCHEDULES).toHaveLength(2);

    const adminOnly = SCREENSHOT_SCHEDULES.find((s) => s.visibility === "superadmin_only");
    const staffVisible = SCREENSHOT_SCHEDULES.find((s) => s.visibility === "admin_and_employee");

    expect(adminOnly?.intervalMs).toBe(6 * 60 * 1000);
    expect(adminOnly?.visibleToRoles).toEqual(["SUPER_ADMIN"]);
    expect(staffVisible?.intervalMs).toBe(10 * 60 * 1000);
    expect(staffVisible?.visibleToRoles).toEqual(["SUPER_ADMIN", "DESIGNER", "MODERATOR"]);
  });

  it("uses independent 6m and 10m first-capture targets", () => {
    expect(initialSuperadminTargetMs()).toBe(superadminIntervalMs());
    expect(initialDesignerTargetMs()).toBe(designerIntervalMs());
    expect(superadminIntervalMs()).toBe(6 * 60 * 1000);
    expect(designerIntervalMs()).toBe(10 * 60 * 1000);
  });

  it("schedules delay to whichever tier fires next", () => {
    const minute = 60 * 1000;
    const startedAt = 1_000_000;

    expect(
      delayMsUntilEarlierTarget(startedAt, 6 * minute, 10 * minute, startedAt)
    ).toBe(6 * minute);

    expect(
      delayMsUntilEarlierTarget(startedAt, 12 * minute, 10 * minute, startedAt + 6 * minute)
    ).toBe(4 * minute);

    expect(
      delayMsUntilEarlierTarget(startedAt, 10 * minute, 10 * minute, startedAt + 8 * minute)
    ).toBe(2 * minute);
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
