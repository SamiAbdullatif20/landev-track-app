import { catalogDisplayNameFromProjectId, isCatalogProjectId } from "../config/designer-project-fallback";
import type { Project } from "../store/trackingStore";
import type { ProjectDayTotal, WorkSummary } from "../types/work-summary";
import type { RecentWorkTask } from "../types/recent-task";

function nameFromProject(project: Project | undefined): string | null {
  if (!project) {
    return null;
  }
  const name = (project.name || project.displayLabel || "").trim();
  return name.length > 0 ? name : null;
}

export function resolveProjectNameForStart(
  projectId: string,
  options: {
    projects: Project[];
    sessionProjectName?: string | null;
    todayByProject?: ProjectDayTotal[];
    recentTasks?: RecentWorkTask[];
  }
): string | null {
  const trimmedId = projectId.trim();
  if (!trimmedId) {
    return null;
  }

  const fromSession = options.sessionProjectName?.trim();
  if (fromSession) {
    return fromSession;
  }

  const fromList = nameFromProject(options.projects.find((project) => project.id === trimmedId));
  if (fromList) {
    return fromList;
  }

  const fromToday = options.todayByProject?.find((row) => row.projectId === trimmedId)?.projectName?.trim();
  if (fromToday) {
    return fromToday;
  }

  const fromRecent = options.recentTasks?.find((task) => task.projectId === trimmedId)?.projectName?.trim();
  if (fromRecent) {
    return fromRecent;
  }

  return catalogDisplayNameFromProjectId(trimmedId);
}

export function canResolveProjectNameForStart(
  projectId: string,
  workSummary: Pick<WorkSummary, "todayByProject" | "recentTasks">,
  projects: Project[],
  sessionProjectName?: string | null
): boolean {
  if (!projectId.trim()) {
    return false;
  }
  if (!isCatalogProjectId(projectId)) {
    return true;
  }
  return Boolean(
    resolveProjectNameForStart(projectId, {
      projects,
      sessionProjectName,
      todayByProject: workSummary.todayByProject,
      recentTasks: workSummary.recentTasks
    })
  );
}
