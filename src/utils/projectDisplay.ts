import type { Project } from "../store/trackingStore";

/** Primary line in picker trigger and list rows (project number for client jobs). */
export function getProjectDisplayLabel(project: Pick<Project, "displayLabel" | "name" | "projectNumber">): string {
  const label = project.displayLabel?.trim();
  if (label) {
    return label;
  }
  const number = project.projectNumber?.trim();
  if (number) {
    return number;
  }
  return project.name.trim();
}

function searchFields(project: Project): string[] {
  return [
    project.searchLabel ?? "",
    project.clientName ?? "",
    project.projectNumber ?? "",
    project.projectAddress ?? "",
    project.name
  ];
}

/** Case-insensitive match: searchLabel first, then clientName, then projectNumber. */
export function projectMatchesQuery(project: Project, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return searchFields(project).some((field) => field.trim().toLowerCase().includes(needle));
}
