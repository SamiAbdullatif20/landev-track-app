import { describe, expect, it } from "vitest";
import { designerCatalogFallbackProjects } from "../config/designer-project-fallback";
import {
  canResolveProjectNameForStart,
  resolveProjectNameForStart
} from "./resolveProjectNameForStart";

describe("resolveProjectNameForStart", () => {
  const adminGeneral = designerCatalogFallbackProjects().find(
    (project) => project.name === "Admin - General"
  )!;

  it("resolves catalog ids from session projectName when projects list is empty", () => {
    expect(
      resolveProjectNameForStart(adminGeneral.id, {
        projects: [],
        sessionProjectName: "Admin - General",
        todayByProject: [],
        recentTasks: []
      })
    ).toBe("Admin - General");
  });

  it("resolves catalog ids from today list when projects are not loaded", () => {
    expect(
      resolveProjectNameForStart(adminGeneral.id, {
        projects: [],
        todayByProject: [
          {
            projectId: adminGeneral.id,
            projectName: "Admin - General",
            totalMs: 60_000,
            lastDescription: "flood report"
          }
        ],
        recentTasks: []
      })
    ).toBe("Admin - General");
  });

  it("allows chargeable api projects without an explicit projectName", () => {
    expect(
      canResolveProjectNameForStart(
        "1604",
        { todayByProject: [], recentTasks: [] },
        [],
        null
      )
    ).toBe(true);
  });

  it("requires a resolvable name for known catalog ids via catalog map", () => {
    expect(
      canResolveProjectNameForStart(
        adminGeneral.id,
        { todayByProject: [], recentTasks: [] },
        [],
        null
      )
    ).toBe(true);
  });

  it("rejects unknown catalog slugs", () => {
    expect(
      canResolveProjectNameForStart(
        "catalog:unknown-task-type",
        { todayByProject: [], recentTasks: [] },
        [],
        null
      )
    ).toBe(false);
  });
});
