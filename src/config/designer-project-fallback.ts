import type { Project } from "../store/trackingStore";

const DESIGNER_CATALOG_NAMES = [
  "Admin - Phone Call",
  "Admin - Design Review",
  "Admin - General",
  "Admin - New Task",
  "Admin - Timesheet",
  "Admin - Training",
  "Admin - Zoom Meeting"
] as const;

const MODERATOR_CATALOG_NAMES = [
  "Client Meeting",
  "Council/WSL Meeting",
  "Site Inspections",
  ...DESIGNER_CATALOG_NAMES
] as const;

const ALL_CATALOG_NAMES = Array.from(new Set([...DESIGNER_CATALOG_NAMES, ...MODERATOR_CATALOG_NAMES]));

export function isCatalogProjectId(projectId: string): boolean {
  return projectId.trim().toLowerCase().startsWith("catalog:");
}

function catalogIdForName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `catalog:${slug || "unknown"}`;
}

/** Reverse lookup: catalog:admin-general → Admin - General */
export function catalogDisplayNameFromProjectId(projectId: string): string | null {
  if (!isCatalogProjectId(projectId)) {
    return null;
  }
  const normalizedId = projectId.trim().toLowerCase();
  for (const name of ALL_CATALOG_NAMES) {
    if (catalogIdForName(name).toLowerCase() === normalizedId) {
      return name;
    }
  }
  return null;
}

/** Last-resort list when IPC returns no projects (e.g. stale build or role mismatch). */
export function designerCatalogFallbackProjects(): Project[] {
  return DESIGNER_CATALOG_NAMES.map((name) => ({
    id: catalogIdForName(name),
    name,
    displayLabel: name,
    searchLabel: name,
    projectNumber: null,
    projectAddress: null,
    clientName: null,
    isNonChargeable: name.trim().toLowerCase().startsWith("admin -"),
    isCatalogDefault: true
  }));
}
