import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../api/client";

const mocks = vi.hoisted(() => ({
  fetchProjectsVersion: vi.fn(),
  fetchProjectsDelta: vi.fn(),
  getAllProjectsPaginated: vi.fn(),
  fetchRoles: vi.fn(async () => ["DESIGNER"]),
  loadProjectsCache: vi.fn((): Project[] => []),
  getProjectsCacheCount: vi.fn(() => 0),
  getProjectsFetchedAt: vi.fn(() => "2026-07-04T00:00:00.000Z"),
  getProjectsVersionFingerprint: vi.fn(() => null as { hash: string; count: number } | null),
  replaceProjectsCache: vi.fn(),
  mergeProjectsDelta: vi.fn(),
  setProjectsVersionFingerprint: vi.fn(),
  resolveVisibleProjects: vi.fn((projects: Project[]) =>
    projects.map((project) => ({
      ...project,
      isNonChargeable: project.isNonChargeable ?? false,
      isCatalogDefault: false
    }))
  ),
  send: vi.fn()
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    fetchProjectsVersion: mocks.fetchProjectsVersion,
    fetchProjectsDelta: mocks.fetchProjectsDelta,
    getAllProjectsPaginated: mocks.getAllProjectsPaginated,
    readCachedUserRoles: vi.fn(() => ["DESIGNER"])
  };
});

vi.mock("../db/projects-cache", () => ({
  getProjectsCacheCount: mocks.getProjectsCacheCount,
  getProjectsFetchedAt: mocks.getProjectsFetchedAt,
  getProjectsVersionFingerprint: mocks.getProjectsVersionFingerprint,
  loadProjectsCache: mocks.loadProjectsCache,
  mergeProjectsDelta: mocks.mergeProjectsDelta,
  replaceProjectsCache: mocks.replaceProjectsCache,
  setProjectsVersionFingerprint: mocks.setProjectsVersionFingerprint
}));

vi.mock("./desktop-notifications", () => ({
  notifyDesktop: vi.fn()
}));

vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("./auth-session", () => ({
  readAuthContext: vi.fn(() => ({ token: "token" })),
  refreshAuthSession: vi.fn()
}));

import { ProjectSyncService } from "./project-sync-service";

const sampleProject: Project = {
  id: "p1",
  name: "Project One",
  displayLabel: "P1",
  searchLabel: "Project One",
  projectNumber: "P1",
  projectAddress: null,
  clientName: null
};

const sampleProjectTwo: Project = { ...sampleProject, id: "p2", name: "Two", displayLabel: "P2" };

function createService(): ProjectSyncService {
  return new ProjectSyncService({
    window: { webContents: { send: mocks.send } } as never,
    resolveVisibleProjects: mocks.resolveVisibleProjects,
    fetchRoles: mocks.fetchRoles
  });
}

describe("ProjectSyncService", () => {
  beforeEach(() => {
    mocks.fetchProjectsVersion.mockReset();
    mocks.fetchProjectsDelta.mockReset();
    mocks.getAllProjectsPaginated.mockReset();
    mocks.replaceProjectsCache.mockReset();
    mocks.mergeProjectsDelta.mockReset();
    mocks.setProjectsVersionFingerprint.mockReset();
    mocks.getProjectsFetchedAt.mockReturnValue("2026-07-04T00:00:00.000Z");
    mocks.getProjectsCacheCount.mockReturnValue(1);
    mocks.getProjectsVersionFingerprint.mockReturnValue({ hash: "abc", count: 1 });
    mocks.loadProjectsCache.mockReturnValue([sampleProject]);
    mocks.replaceProjectsCache.mockReturnValue({
      localCountBefore: 1,
      serverCount: 1,
      localCountAfter: 1,
      idsChanged: false,
      addedIds: [],
      removedIds: []
    });
  });

  it("skips full fetch when version fingerprint is unchanged", async () => {
    mocks.fetchProjectsVersion.mockResolvedValue({ hash: "abc", count: 1 });

    const result = await createService().syncNow();

    expect(result.skipped).toBe(true);
    expect(mocks.fetchProjectsDelta).not.toHaveBeenCalled();
    expect(mocks.getAllProjectsPaginated).not.toHaveBeenCalled();
  });

  it("incrementally adds new projects without downloading the full list", async () => {
    mocks.fetchProjectsVersion.mockResolvedValue({ hash: "new-hash", count: 2 });
    mocks.fetchProjectsDelta.mockResolvedValue({
      projects: [sampleProjectTwo],
      removedIds: [],
      serverCount: 2
    });
    mocks.mergeProjectsDelta.mockReturnValue({
      localCountBefore: 1,
      localCountAfter: 2,
      addedIds: ["p2"],
      updatedIds: [],
      removedIds: []
    });
    mocks.loadProjectsCache.mockReturnValue([sampleProject, sampleProjectTwo]);

    const result = await createService().syncNow();

    expect(mocks.fetchProjectsDelta).toHaveBeenCalledTimes(1);
    expect(mocks.fetchProjectsDelta).toHaveBeenCalledWith(
      "2026-07-04T00:00:00.000Z",
      expect.anything()
    );
    expect(mocks.mergeProjectsDelta).toHaveBeenCalledWith([sampleProjectTwo], [], expect.any(String));
    expect(mocks.getAllProjectsPaginated).not.toHaveBeenCalled();
    expect(mocks.setProjectsVersionFingerprint).toHaveBeenCalledWith({ hash: "new-hash", count: 2 });
    expect(result.serverCount).toBe(2);
    expect(result.localCount).toBe(2);
  });

  it("falls back to a full fetch when the delta endpoint is unavailable", async () => {
    mocks.fetchProjectsVersion
      .mockResolvedValueOnce({ hash: "new-hash", count: 2 })
      .mockResolvedValueOnce({ hash: "new-hash", count: 2 });
    mocks.fetchProjectsDelta.mockResolvedValue(null);
    mocks.getAllProjectsPaginated.mockResolvedValue([sampleProject, sampleProjectTwo]);
    mocks.replaceProjectsCache.mockReturnValue({
      localCountBefore: 1,
      serverCount: 2,
      localCountAfter: 2,
      idsChanged: true,
      addedIds: ["p2"],
      removedIds: []
    });

    await createService().syncNow();

    expect(mocks.fetchProjectsDelta).toHaveBeenCalledTimes(1);
    expect(mocks.getAllProjectsPaginated).toHaveBeenCalledTimes(1);
    expect(mocks.setProjectsVersionFingerprint).toHaveBeenCalledWith({ hash: "new-hash", count: 2 });
  });

  it("falls back to a full fetch when the delta does not reconcile the server count", async () => {
    mocks.fetchProjectsVersion
      .mockResolvedValueOnce({ hash: "new-hash", count: 3 })
      .mockResolvedValueOnce({ hash: "new-hash", count: 3 });
    mocks.fetchProjectsDelta.mockResolvedValue({
      projects: [sampleProjectTwo],
      removedIds: [],
      serverCount: 3
    });
    mocks.mergeProjectsDelta.mockReturnValue({
      localCountBefore: 1,
      localCountAfter: 2,
      addedIds: ["p2"],
      updatedIds: [],
      removedIds: []
    });
    mocks.getAllProjectsPaginated.mockResolvedValue([sampleProject, sampleProjectTwo]);
    mocks.replaceProjectsCache.mockReturnValue({
      localCountBefore: 2,
      serverCount: 3,
      localCountAfter: 3,
      idsChanged: true,
      addedIds: ["p3"],
      removedIds: []
    });

    await createService().syncNow();

    expect(mocks.mergeProjectsDelta).toHaveBeenCalledTimes(1);
    expect(mocks.getAllProjectsPaginated).toHaveBeenCalledTimes(1);
  });

  it("getCached does not call the network", async () => {
    const result = createService().getCached();

    expect(result.projects).toHaveLength(1);
    expect(mocks.fetchProjectsVersion).not.toHaveBeenCalled();
    expect(mocks.fetchProjectsDelta).not.toHaveBeenCalled();
    expect(mocks.getAllProjectsPaginated).not.toHaveBeenCalled();
  });
});
