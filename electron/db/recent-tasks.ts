import { getSetting, setSetting } from "./queue-repo";
import { getCurrentAppUserKey } from "./user-scope";

export type RecentWorkTask = {
  projectId: string;
  projectName: string;
  description: string;
  isNonChargeable: boolean;
  lastUsedAt: string;
};

const RECENT_TASKS_KEY = "recentWorkTasks";
const MAX_RECENT_TASKS = 40;

function recentTasksSettingKey(): string | null {
  const userKey = getCurrentAppUserKey();
  if (!userKey) {
    return null;
  }
  return `${RECENT_TASKS_KEY}:${userKey}`;
}

export function getRecentWorkTasks(): RecentWorkTask[] {
  const settingKey = recentTasksSettingKey();
  if (!settingKey) {
    return [];
  }
  const raw = getSetting(settingKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentWorkTask => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        return (
          typeof row.projectId === "string"
          && typeof row.projectName === "string"
          && typeof row.description === "string"
          && typeof row.lastUsedAt === "string"
        );
      })
      .slice(0, MAX_RECENT_TASKS);
  } catch {
    return [];
  }
}

export function recordRecentWorkTask(task: Omit<RecentWorkTask, "lastUsedAt">): void {
  const settingKey = recentTasksSettingKey();
  if (!settingKey) {
    return;
  }

  const normalizedDescription = task.description.trim();
  if (!task.projectId.trim() || !task.projectName.trim() || normalizedDescription.length === 0) {
    return;
  }

  const entry: RecentWorkTask = {
    projectId: task.projectId.trim(),
    projectName: task.projectName.trim(),
    description: normalizedDescription,
    isNonChargeable: Boolean(task.isNonChargeable),
    lastUsedAt: new Date().toISOString()
  };

  const deduped = getRecentWorkTasks().filter(
    (existing) =>
      existing.projectId !== entry.projectId || existing.description !== entry.description
  );
  const next = [entry, ...deduped].slice(0, MAX_RECENT_TASKS);
  setSetting(settingKey, JSON.stringify(next));
}
