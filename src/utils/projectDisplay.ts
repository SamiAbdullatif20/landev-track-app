import type { Project } from "../store/trackingStore";

/** Primary line in picker trigger and list rows (project name). */
export function getProjectDisplayLabel(project: Pick<Project, "displayLabel" | "name" | "projectNumber">): string {
  const name = project.name.trim();
  if (name) {
    return name;
  }
  const label = project.displayLabel?.trim();
  if (label) {
    return label;
  }
  const number = project.projectNumber?.trim();
  if (number) {
    return number;
  }
  return "Unnamed project";
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
