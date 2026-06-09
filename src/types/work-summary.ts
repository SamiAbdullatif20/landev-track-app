import type { RecentWorkTask } from "./recent-task";

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
