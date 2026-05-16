import type { Project } from "../api/client";

/** Canonical display names per role (order preserved in dropdown). */
export const DESIGNER_PROJECT_NAMES = [
  "Admin - Phone Call",
  "Admin - Design Review",
  "Admin - General",
  "Admin - New Task",
  "Admin - Timesheet",
  "Admin - Training",
  "Admin - Zoom Meeting"
] as const;

export const MODERATOR_PROJECT_NAMES = [
  "Client Meeting",
  "Council/WSL Meeting",
  "Site Inspections",
  "Admin - Phone Call",
  "Admin - Design Review",
  "Admin - General",
  "Admin - New Task",
  "Admin - Timesheet",
  "Admin - Training",
  "Admin - Zoom Meeting"
] as const;

export type RoleProject = Project & {
  isNonChargeable: boolean;
  isCatalogDefault: boolean;
};

export function isNonChargeableProjectName(name: string): boolean {
  return name.trim().toLowerCase().startsWith("admin -");
}

/** Synthetic ids for catalog rows not yet returned by the API. */
export function isCatalogProjectId(projectId: string): boolean {
  return projectId.trim().toLowerCase().startsWith("catalog:");
}

export function normalizeRoleKey(role: string): string {
  return role.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function isSuperAdminRole(roles: string[]): boolean {
  return roles.some((r) => {
    const key = normalizeRoleKey(r);
    return (
      key === "SUPER_ADMIN"
      || key === "SUPERADMIN"
      || key === "SUPER_ADMINISTRATOR"
      || key === "SUPER_ADMINISTRATOR_ROLE"
    );
  });
}

export function isDesignerRole(roles: string[]): boolean {
  return roles.some((r) => {
    const key = normalizeRoleKey(r);
    if (key === "DESIGNER" || key.endsWith("_DESIGNER") || key.startsWith("DESIGNER_")) {
      return true;
    }
    // Backend variants: ROLE_DESIGNER, DESIGNER_ROLE, StaffDesigner, etc.
    return key.includes("DESIGNER") && !key.includes("MODERATOR") && !key.includes("SUPER");
  });
}

/** Designers and unknown staff roles use the designer catalog (not moderators / super admins). */
export function shouldUseDesignerCatalog(roles: string[]): boolean {
  if (isSuperAdminRole(roles) || isModeratorRole(roles)) {
    return false;
  }
  if (roles.length === 0) {
    return true;
  }
  return isDesignerRole(roles) || !isModeratorRole(roles);
}

export function isModeratorRole(roles: string[]): boolean {
  return roles.some((r) => {
    const key = normalizeRoleKey(r);
    if (key === "MODERATOR" || key.endsWith("_MODERATOR") || key.startsWith("MODERATOR_")) {
      return true;
    }
    return key.includes("MODERATOR") && !key.includes("SUPER");
  });
}

function catalogIdForName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `catalog:${slug || "unknown"}`;
}

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function toRoleProject(
  name: string,
  apiMatch: Project | undefined,
  isCatalogDefault: boolean
): RoleProject {
  const isNonChargeable =
    apiMatch && typeof (apiMatch as Project & { isNonChargeable?: boolean }).isNonChargeable === "boolean"
      ? Boolean((apiMatch as Project & { isNonChargeable?: boolean }).isNonChargeable)
      : isNonChargeableProjectName(name);

  return {
    id: apiMatch?.id ?? catalogIdForName(name),
    name,
    projectNumber: apiMatch?.projectNumber ?? null,
    clientName: apiMatch?.clientName ?? null,
    isNonChargeable,
    isCatalogDefault
  };
}

export function mergeCatalogWithApi(apiProjects: Project[], catalogNames: readonly string[]): RoleProject[] {
  const byName = new Map<string, Project>();
  for (const project of apiProjects) {
    byName.set(normalizeNameKey(project.name), project);
  }

  return catalogNames.map((name) => {
    const apiMatch = byName.get(normalizeNameKey(name));
    return toRoleProject(name, apiMatch, !apiMatch);
  });
}

/** Role catalog first, then assigned API projects not already listed in the catalog. */
export function combineCatalogWithApi(
  apiProjects: Project[],
  catalogNames: readonly string[]
): RoleProject[] {
  const catalogRows = mergeCatalogWithApi(apiProjects, catalogNames);
  const catalogNameKeys = new Set(catalogNames.map((name) => normalizeNameKey(name)));
  const extraApi = apiProjects
    .filter((project) => !catalogNameKeys.has(normalizeNameKey(project.name)))
    .map((project) => toRoleProject(project.name, project, false));

  return [...catalogRows, ...extraApi];
}

function tagApiProjects(apiProjects: Project[]): RoleProject[] {
  return apiProjects.map((project) =>
    toRoleProject(project.name, project, false)
  );
}

/**
 * Super admin / designer / moderator: admin (and moderator) catalog plus assigned API projects.
 * Unknown role: API list only with non-chargeable flags.
 * Never returns an empty list when a catalog or API fallback can be used.
 */
export function resolveProjectsForRoles(apiProjects: Project[], roles: string[]): RoleProject[] {
  let resolved: RoleProject[] = [];

  if (isSuperAdminRole(roles)) {
    resolved = combineCatalogWithApi(apiProjects, DESIGNER_PROJECT_NAMES);
  } else if (isModeratorRole(roles)) {
    resolved = combineCatalogWithApi(apiProjects, MODERATOR_PROJECT_NAMES);
  } else if (shouldUseDesignerCatalog(roles)) {
    resolved = combineCatalogWithApi(apiProjects, DESIGNER_PROJECT_NAMES);
  } else {
    resolved = tagApiProjects(apiProjects);
  }

  if (resolved.length > 0) {
    return resolved;
  }

  if (apiProjects.length > 0) {
    return tagApiProjects(apiProjects);
  }

  if (isModeratorRole(roles)) {
    return mergeCatalogWithApi([], MODERATOR_PROJECT_NAMES);
  }

  return mergeCatalogWithApi([], DESIGNER_PROJECT_NAMES);
}
