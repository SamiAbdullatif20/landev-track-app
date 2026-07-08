/** Always capture once this many ms after session start (in addition to tier intervals). */
export const SESSION_START_SCREENSHOT_DELAY_MS = 60 * 1000;

/** Minutes between captures for each tier. Longer = fewer uploads + less Supabase storage. */
export const SCREENSHOT_INTERVAL_MINUTES = {
  /** Admin-only tier (SUPER_ADMIN in web UI). */
  superadminOnly: 20,
  /** Employee + admin tier (DESIGNER, MODERATOR, SUPER_ADMIN). */
  superadminAndDesigner: 30
} as const;

export type ScreenshotVisibility = "superadmin_only" | "admin_and_employee";

export type ScreenshotSchedule = {
  intervalMs: number;
  intervalMinutes: number;
  visibility: ScreenshotVisibility;
  /** Roles allowed to view in web admin/employee report (enforced server-side). */
  visibleToRoles: readonly string[];
};

export const SCREENSHOT_SCHEDULES: readonly ScreenshotSchedule[] = [
  {
    intervalMs: SCREENSHOT_INTERVAL_MINUTES.superadminOnly * 60 * 1000,
    intervalMinutes: SCREENSHOT_INTERVAL_MINUTES.superadminOnly,
    visibility: "superadmin_only",
    visibleToRoles: ["SUPER_ADMIN"]
  },
  {
    intervalMs: SCREENSHOT_INTERVAL_MINUTES.superadminAndDesigner * 60 * 1000,
    intervalMinutes: SCREENSHOT_INTERVAL_MINUTES.superadminAndDesigner,
    visibility: "admin_and_employee",
    visibleToRoles: ["SUPER_ADMIN", "DESIGNER", "MODERATOR"]
  }
];

export function scheduleForVisibility(visibility: ScreenshotVisibility): ScreenshotSchedule | null {
  return SCREENSHOT_SCHEDULES.find((item) => item.visibility === visibility) ?? null;
}

export function superadminIntervalMs(): number {
  return SCREENSHOT_INTERVAL_MINUTES.superadminOnly * 60 * 1000;
}

export function designerIntervalMs(): number {
  return SCREENSHOT_INTERVAL_MINUTES.superadminAndDesigner * 60 * 1000;
}

/** First admin-only capture at the superadmin interval, then every interval. */
export function initialSuperadminTargetMs(): number {
  return superadminIntervalMs();
}

/** First designer-visible capture at the designer interval, then every interval. */
export function initialDesignerTargetMs(): number {
  return designerIntervalMs();
}

/** Delay until the next capture target (bootstrap, superadmin, or designer — whichever is soonest). */
export function delayMsUntilEarlierTarget(
  startedAtMs: number,
  superadminTargetMs: number,
  designerTargetMs: number,
  bootstrapTargetMs: number | null = SESSION_START_SCREENSHOT_DELAY_MS,
  nowMs = Date.now()
): number {
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  const candidates = [
    Math.max(0, superadminTargetMs - elapsedMs),
    Math.max(0, designerTargetMs - elapsedMs)
  ];
  if (bootstrapTargetMs !== null) {
    candidates.push(Math.max(0, bootstrapTargetMs - elapsedMs));
  }
  return Math.max(250, Math.min(...candidates));
}

/** Which screenshot tiers are due at elapsed session time (10-min wins on overlap). */
export function schedulesDueAtElapsed(
  elapsedMs: number,
  nextSuperadminTargetMs: number,
  nextDesignerTargetMs: number,
  toleranceMs = 500
): ScreenshotSchedule[] {
  const superadminDue = elapsedMs + toleranceMs >= nextSuperadminTargetMs;
  const designerDue = elapsedMs + toleranceMs >= nextDesignerTargetMs;

  if (superadminDue && designerDue) {
    const employeeSchedule = scheduleForVisibility("admin_and_employee");
    return employeeSchedule ? [employeeSchedule] : [];
  }

  const due: ScreenshotSchedule[] = [];

  if (superadminDue) {
    const schedule = scheduleForVisibility("superadmin_only");
    if (schedule) {
      due.push(schedule);
    }
  }

  if (designerDue) {
    const schedule = scheduleForVisibility("admin_and_employee");
    if (schedule) {
      due.push(schedule);
    }
  }

  return due;
}
