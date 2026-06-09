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

function catalogIdForName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `catalog:${slug || "unknown"}`;
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
