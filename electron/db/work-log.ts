import { randomUUID } from "node:crypto";
import { getClientIanaTimeZone } from "../config/client-timezone";
import {
  clipRangeToWorkDay,
  formatWorkDateKeyAt,
  mergeIntervalsTotalMs,
  type MsInterval
} from "../utils/work-date-key";
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
  stopReason?: "USER" | "INACTIVITY_AUTO";
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
  stopReason?: "USER" | "INACTIVITY_AUTO";
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
    durationMs: stoppedMs - startedMs,
    ...(input.stopReason ? { stopReason: input.stopReason } : {})
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

function collectTodayIntervals(
  entries: WorkLogEntry[],
  today: string,
  timeZone: string
): { all: MsInterval[]; byProject: Map<string, MsInterval[]> } {
  const all: MsInterval[] = [];
  const byProject = new Map<string, MsInterval[]>();

  for (const entry of entries) {
    const clipped = clipRangeToWorkDay(entry.startedAt, entry.stoppedAt, today, timeZone);
    if (!clipped) {
      continue;
    }
    all.push(clipped);
    const projectIntervals = byProject.get(entry.projectId) ?? [];
    projectIntervals.push(clipped);
    byProject.set(entry.projectId, projectIntervals);
  }

  return { all, byProject };
}

/**
 * When mirroring a web session, avoid backdating before completed desktop segments
 * for the same project — that double-counts overlapping wall-clock time in Today totals.
 */
export function resolveMirroredSessionStartedAt(
  remoteStartedAt: string,
  projectId: string,
  mirrorNowMs: number = Date.now()
): string {
  const remoteMs = Date.parse(remoteStartedAt);
  const mirrorMs = mirrorNowMs;
  if (!Number.isFinite(remoteMs)) {
    return new Date(mirrorMs).toISOString();
  }

  const timeZone = getClientIanaTimeZone();
  const today = todayKey(timeZone);
  let latestStoppedMs = 0;

  for (const entry of readWorkLogEntries()) {
    if (entry.projectId !== projectId) {
      continue;
    }
    if (!clipRangeToWorkDay(entry.startedAt, entry.stoppedAt, today, timeZone)) {
      continue;
    }
    const stoppedMs = Date.parse(entry.stoppedAt);
    if (Number.isFinite(stoppedMs)) {
      latestStoppedMs = Math.max(latestStoppedMs, stoppedMs);
    }
  }

  if (latestStoppedMs > 0) {
    return new Date(Math.max(latestStoppedMs, mirrorMs)).toISOString();
  }

  return remoteStartedAt;
}

export function getWorkSummary(activeSession?: {
  projectId: string | null;
  projectName: string | null;
  startedAt: string | null;
}): WorkSummary {
  const timeZone = getClientIanaTimeZone();
  const today = todayKey(timeZone);
  const entries = readWorkLogEntries();
  const { all: todayIntervals, byProject: intervalsByProject } = collectTodayIntervals(
    entries,
    today,
    timeZone
  );

  const projectMeta = new Map<string, { projectName: string; lastDescription: string }>();
  for (const entry of entries) {
    if (!clipRangeToWorkDay(entry.startedAt, entry.stoppedAt, today, timeZone)) {
      continue;
    }
    projectMeta.set(entry.projectId, {
      projectName: entry.projectName,
      lastDescription: entry.description
    });
  }

  if (activeSession?.startedAt && activeSession.projectId) {
    const liveClip = clipRangeToWorkDay(
      activeSession.startedAt,
      new Date().toISOString(),
      today,
      timeZone
    );
    if (liveClip) {
      todayIntervals.push(liveClip);
      const projectIntervals = intervalsByProject.get(activeSession.projectId) ?? [];
      projectIntervals.push(liveClip);
      intervalsByProject.set(activeSession.projectId, projectIntervals);

      const projectName =
        activeSession.projectName?.trim()
        || getSetting(ACTIVE_PROJECT_NAME_KEY)?.trim()
        || activeSession.projectId;
      const existingMeta = projectMeta.get(activeSession.projectId);
      if (!existingMeta) {
        projectMeta.set(activeSession.projectId, {
          projectName,
          lastDescription: ""
        });
      }
    }
  }

  const recentCutoffMs = Date.now() - RECENT_TASK_DAYS * 24 * 60 * 60 * 1000;
  const recentTasks = getRecentWorkTasks().filter(
    (task) => Date.parse(task.lastUsedAt) >= recentCutoffMs
  );

  const todayByProjectSorted = Array.from(intervalsByProject.entries())
    .map(([projectId, intervals]) => {
      const meta = projectMeta.get(projectId);
      return {
        projectId,
        projectName: meta?.projectName ?? projectId,
        totalMs: mergeIntervalsTotalMs(intervals),
        lastDescription: meta?.lastDescription ?? ""
      };
    })
    .sort((a, b) =>
      a.projectName.localeCompare(b.projectName, undefined, { sensitivity: "base" })
    );

  return {
    todayTotalMs: mergeIntervalsTotalMs(todayIntervals),
    todayByProject: todayByProjectSorted,
    recentTasks
  };
}
