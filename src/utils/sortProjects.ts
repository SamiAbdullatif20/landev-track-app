import type { Project } from "../store/trackingStore";
import { getProjectDisplayLabel, projectMatchesQuery } from "./projectDisplay";

export const PINNED_ADMIN_NEW_TASK = "Admin - New Task";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function isPinnedAdminNewTask(project: Pick<Project, "name">): boolean {
  return normalizeName(project.name) === normalizeName(PINNED_ADMIN_NEW_TASK);
}

export function sortProjectsForDisplay(projects: Project[]): Project[] {
  const pinned: Project[] = [];
  const rest: Project[] = [];

  for (const project of projects) {
    if (isPinnedAdminNewTask(project)) {
      pinned.push(project);
    } else {
      rest.push(project);
    }
  }

  rest.sort((a, b) =>
    getProjectDisplayLabel(a).localeCompare(getProjectDisplayLabel(b), undefined, { sensitivity: "base" })
  );
  return [...pinned, ...rest];
}

export function filterProjectsByQuery(projects: Project[], query: string): Project[] {
  return projects.filter((project) => projectMatchesQuery(project, query));
}
