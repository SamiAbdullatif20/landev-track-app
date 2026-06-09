import { randomUUID } from "node:crypto";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { formatWorkDateKeyAt, getWorkDayOverlapMs } from "../utils/work-date-key";
import { getSetting, setSetting } from "./queue-repo";
import type { RecentWorkTask } from "./recent-tasks";
import { getRecentWorkTasks, recordRecentWorkTask } from "./recent-tasks";
import { getCurrentAppUserKey } from "./user-scope";

export type WorkLogEntry = {
  id: string;
  userKey?: string;
  projectId: string;
  projectName: string;
  description: string;
  startedAt: string;
  stoppedAt: string;
  durationMs: number;
};

export type ProjectDayTotal = {
  projectId: string;
  projectName: string;
  totalMs: number;
  lastDescription: string;
};

export type WorkSummary = {
  todayTotalMs: number;
  todayByProject: ProjectDayTotal[];
  recentTasks: RecentWorkTask[];
};

const WORK_LOG_KEY = "workLogEntries";
const ACTIVE_PROJECT_NAME_KEY = "activeSessionProjectName";
const MAX_LOG_ENTRIES = 400;
const RECENT_TASK_DAYS = 3;

function isValidWorkLogEntry(item: unknown): item is WorkLogEntry {
  if (!item || typeof item !== "object") return false;
  const row = item as Record<string, unknown>;
  return (
    typeof row.id === "string"
    && typeof row.projectId === "string"
    && typeof row.projectName === "string"
    && typeof row.description === "string"
    && typeof row.startedAt === "string"
    && typeof row.stoppedAt === "string"
    && typeof row.durationMs === "number"
  );
}

function belongsToCurrentUser(entry: WorkLogEntry): boolean {
  const current = getCurrentAppUserKey();
  if (!current) {
    return false;
  }
  if (!entry.userKey) {
    return false;
  }
  return entry.userKey === current;
}

function parseStoredWorkLogEntries(): WorkLogEntry[] {
  const raw = getSetting(WORK_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidWorkLogEntry);
  } catch {
    return [];
  }
}

function readWorkLogEntries(): WorkLogEntry[] {
  return parseStoredWorkLogEntries().filter(belongsToCurrentUser);
}

function writeWorkLogEntries(entries: WorkLogEntry[]): void {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pruned = entries.filter((entry) => Date.parse(entry.stoppedAt) >= cutoff).slice(0, MAX_LOG_ENTRIES);
  setSetting(WORK_LOG_KEY, JSON.stringify(pruned));
}

export function setActiveSessionProjectName(projectName: string): void {
  setSetting(ACTIVE_PROJECT_NAME_KEY, projectName.trim());
}

export function clearActiveSessionProjectName(): void {
  setSetting(ACTIVE_PROJECT_NAME_KEY, "");
}

function todayKey(timeZone: string): string {
  return formatWorkDateKeyAt(Date.now(), timeZone);
}

export function recordCompletedWorkSession(input: {
  projectId: string;
  projectName: string;
  description: string;
  isNonChargeable: boolean;
  startedAt: string;
  stoppedAt: string;
}): void {
  const userKey = getCurrentAppUserKey();
  if (!userKey) {
    return;
  }

  const startedMs = Date.parse(input.startedAt);
  const stoppedMs = Date.parse(input.stoppedAt);
  if (!Number.isFinite(startedMs) || !Number.isFinite(stoppedMs) || stoppedMs <= startedMs) {
    return;
  }

  const entry: WorkLogEntry = {
    id: randomUUID(),
    userKey,
    projectId: input.projectId.trim(),
    projectName: input.projectName.trim(),
    description: input.description.trim(),
    startedAt: input.startedAt,
    stoppedAt: input.stoppedAt,
    durationMs: stoppedMs - startedMs
  };

  const next = [entry, ...parseStoredWorkLogEntries()];
  writeWorkLogEntries(next);

  recordRecentWorkTask({
    projectId: entry.projectId,
    projectName: entry.projectName,
    description: entry.description,
    isNonChargeable: input.isNonChargeable
  });
}

export function getWorkSummary(activeSession?: {
  projectId: string | null;
  projectName: string | null;
  startedAt: string | null;
}): WorkSummary {
  const timeZone = getClientIanaTimeZone();
  const today = todayKey(timeZone);
  const entries = readWorkLogEntries();

  let todayTotalMs = 0;
  const byProject = new Map<string, ProjectDayTotal>();

  for (const entry of entries) {
    const dayMs = getWorkDayOverlapMs(entry.startedAt, entry.stoppedAt, today, timeZone);
    if (dayMs <= 0) {
      continue;
    }
    todayTotalMs += dayMs;
    const existing = byProject.get(entry.projectId);
    if (existing) {
      existing.totalMs += dayMs;
      existing.lastDescription = entry.description;
    } else {
      byProject.set(entry.projectId, {
        projectId: entry.projectId,
        projectName: entry.projectName,
        totalMs: dayMs,
        lastDescription: entry.description
      });
    }
  }

  const recentCutoffMs = Date.now() - RECENT_TASK_DAYS * 24 * 60 * 60 * 1000;
  const recentTasks = getRecentWorkTasks().filter(
    (task) => Date.parse(task.lastUsedAt) >= recentCutoffMs
  );

  if (activeSession?.startedAt && activeSession.projectId) {
    const liveMs = getWorkDayOverlapMs(
      activeSession.startedAt,
      new Date().toISOString(),
      today,
      timeZone
    );
    if (liveMs > 0) {
      todayTotalMs += liveMs;
      const projectName =
        activeSession.projectName?.trim()
        || getSetting(ACTIVE_PROJECT_NAME_KEY)?.trim()
        || activeSession.projectId;
      const existing = byProject.get(activeSession.projectId);
      if (existing) {
        existing.totalMs += liveMs;
      } else {
        byProject.set(activeSession.projectId, {
          projectId: activeSession.projectId,
          projectName,
          totalMs: liveMs,
          lastDescription: ""
        });
      }
    }
  }

  const todayByProjectSorted = Array.from(byProject.values()).sort((a, b) =>
    a.projectName.localeCompare(b.projectName, undefined, { sensitivity: "base" })
  );

  return {
    todayTotalMs,
    todayByProject: todayByProjectSorted,
    recentTasks
  };
}
