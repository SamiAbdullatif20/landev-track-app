import { describe, expect, it } from "vitest";
import {
  catalogDisplayNameFromProjectId,
  isCatalogProjectId,
  isNonChargeableProjectName,
  isDesignerRole,
  isModeratorRole,
  isSuperAdminRole,
  resolveProjectsForRoles,
  shouldUseDesignerCatalog
} from "./role-project-catalog";
import type { Project } from "../api/client";

describe("isNonChargeableProjectName", () => {
  it("flags Admin - prefixed names", () => {
    expect(isNonChargeableProjectName("Admin - Phone Call")).toBe(true);
    expect(isNonChargeableProjectName("Client Meeting")).toBe(false);
  });
});

describe("isCatalogProjectId", () => {
  it("detects synthetic catalog ids", () => {
    expect(isCatalogProjectId("catalog:admin-phone-call")).toBe(true);
    expect(isCatalogProjectId("p1")).toBe(false);
  });
});

describe("catalogDisplayNameFromProjectId", () => {
  it("resolves catalog ids to canonical display names", () => {
    expect(catalogDisplayNameFromProjectId("catalog:admin-general")).toBe("Admin - General");
    expect(catalogDisplayNameFromProjectId("catalog:client-meeting")).toBe("Client Meeting");
  });

  it("returns null for non-catalog ids", () => {
    expect(catalogDisplayNameFromProjectId("1604")).toBeNull();
    expect(catalogDisplayNameFromProjectId("catalog:unknown-task")).toBeNull();
  });
});

describe("resolveProjectsForRoles", () => {
  const api: Project[] = [
    {
      id: "p1",
      name: "Admin - Phone Call",
      displayLabel: "Admin - Phone Call",
      searchLabel: "Admin - Phone Call",
      projectNumber: null,
      projectAddress: null,
      clientName: null
    },
    {
      id: "p2",
      name: "Client Meeting",
      displayLabel: "C1",
      searchLabel: "123 Main St, Auckland",
      projectNumber: "C1",
      projectAddress: "123 Main St, Auckland",
      clientName: "Acme"
    }
  ];

  it("designer sees admin catalog and assigned api projects", () => {
    const rows = resolveProjectsForRoles(api, ["DESIGNER"]);
    expect(rows.some((r) => r.name === "Admin - Zoom Meeting")).toBe(true);
    expect(rows.some((r) => r.name === "Client Meeting")).toBe(true);
    expect(rows.find((r) => r.name === "Admin - Phone Call")?.id).toBe("p1");
  });

  it("moderator sees moderator catalog and assigned api projects", () => {
    const rows = resolveProjectsForRoles(api, ["MODERATOR"]);
    expect(rows.some((r) => r.name === "Client Meeting")).toBe(true);
    expect(rows.some((r) => r.name === "Site Inspections")).toBe(true);
    expect(rows.some((r) => r.name === "Admin - Zoom Meeting")).toBe(true);
  });

  it("super admin sees admin catalog and all api projects", () => {
    const rows = resolveProjectsForRoles(api, ["SUPER_ADMIN"]);
    expect(rows.some((r) => r.name === "Client Meeting")).toBe(true);
    expect(rows.some((r) => r.name === "Admin - Zoom Meeting")).toBe(true);
    expect(rows.find((r) => r.name === "Admin - Phone Call")?.id).toBe("p1");
  });

  it("marks admin projects non-chargeable", () => {
    const rows = resolveProjectsForRoles(api, ["SUPER_ADMIN"]);
    expect(rows.find((r) => r.name === "Admin - Phone Call")?.isNonChargeable).toBe(true);
    expect(rows.find((r) => r.name === "Client Meeting")?.isNonChargeable).toBe(false);
  });

  it("never returns empty when API is empty", () => {
    const designerRows = resolveProjectsForRoles([], ["DESIGNER"]);
    expect(designerRows.length).toBeGreaterThan(0);

    const unknownRows = resolveProjectsForRoles([], []);
    expect(unknownRows.length).toBeGreaterThan(0);
  });
});

describe("role helpers", () => {
  it("detects role variants", () => {
    expect(isDesignerRole(["designer"])).toBe(true);
    expect(isDesignerRole(["ROLE_DESIGNER"])).toBe(true);
    expect(isModeratorRole(["MODERATOR"])).toBe(true);
    expect(isSuperAdminRole(["super_admin"])).toBe(true);
  });

  it("uses designer catalog when roles are missing or generic staff", () => {
    expect(shouldUseDesignerCatalog([])).toBe(true);
    expect(shouldUseDesignerCatalog(["EMPLOYEE"])).toBe(true);
    expect(shouldUseDesignerCatalog(["MODERATOR"])).toBe(false);
    expect(shouldUseDesignerCatalog(["SUPER_ADMIN"])).toBe(false);
  });
});
