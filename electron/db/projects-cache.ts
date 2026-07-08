import type { Project } from "../api/client";
import { getDb } from "./index";
import { getSetting, setSetting } from "./queue-repo";

export const PROJECTS_FETCHED_AT_KEY = "projectsCacheFetchedAt";
export const PROJECTS_VERSION_HASH_KEY = "projectsCacheVersionHash";
export const PROJECTS_VERSION_COUNT_KEY = "projectsCacheVersionCount";

export type ProjectsVersionFingerprint = {
  hash: string;
  count: number;
};

export type ProjectsCacheReplaceResult = {
  localCountBefore: number;
  serverCount: number;
  localCountAfter: number;
  idsChanged: boolean;
  addedIds: string[];
  removedIds: string[];
};

export function getProjectsFetchedAt(): string | null {
  const value = getSetting(PROJECTS_FETCHED_AT_KEY);
  return value && value.length > 0 ? value : null;
}

export function getProjectsVersionFingerprint(): ProjectsVersionFingerprint | null {
  const hash = getSetting(PROJECTS_VERSION_HASH_KEY)?.trim();
  const countRaw = getSetting(PROJECTS_VERSION_COUNT_KEY);
  if (!hash) {
    return null;
  }
  const count = Number(countRaw);
  if (!Number.isFinite(count) || count < 0) {
    return null;
  }
  return { hash, count };
}

export function setProjectsVersionFingerprint(fingerprint: ProjectsVersionFingerprint): void {
  setSetting(PROJECTS_VERSION_HASH_KEY, fingerprint.hash);
  setSetting(PROJECTS_VERSION_COUNT_KEY, String(fingerprint.count));
}

export function clearProjectsVersionFingerprint(): void {
  setSetting(PROJECTS_VERSION_HASH_KEY, "");
  setSetting(PROJECTS_VERSION_COUNT_KEY, "");
}

export function getProjectCacheIds(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM project_cache").all() as Array<{ id: string }>;
  return rows.map((row) => row.id);
}

export function getProjectsCacheCount(): number {
  return getProjectCacheIds().length;
}

export function loadProjectsCache(): Project[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT payloadJson FROM project_cache ORDER BY displayLabel COLLATE NOCASE ASC")
    .all() as Array<{ payloadJson: string }>;
  const projects: Project[] = [];
  for (const row of rows) {
    try {
      projects.push(JSON.parse(row.payloadJson) as Project);
    } catch {
      // Skip malformed rows.
    }
  }
  return projects;
}

export function compareProjectIdSets(
  localIds: string[],
  serverIds: string[]
): { idsChanged: boolean; addedIds: string[]; removedIds: string[] } {
  const local = new Set(localIds);
  const server = new Set(serverIds);
  const addedIds: string[] = [];
  const removedIds: string[] = [];

  for (const id of Array.from(server)) {
    if (!local.has(id)) {
      addedIds.push(id);
    }
  }
  for (const id of Array.from(local)) {
    if (!server.has(id)) {
      removedIds.push(id);
    }
  }

  return {
    idsChanged: addedIds.length > 0 || removedIds.length > 0,
    addedIds,
    removedIds
  };
}

/**
 * Replace cache with the latest full paginated API result (not append-only).
 * Removes rows absent from the server; upserts all server rows.
 */
export function replaceProjectsCache(projects: Project[], fetchedAt: string): ProjectsCacheReplaceResult {
  const db = getDb();
  const localIds = getProjectCacheIds();
  const serverIds = projects.map((project) => project.id);
  const { idsChanged, addedIds, removedIds } = compareProjectIdSets(localIds, serverIds);
  const localCountBefore = localIds.length;

  const upsert = db.prepare(`
    INSERT INTO project_cache (id, displayLabel, payloadJson, updatedAt)
    VALUES (@id, @displayLabel, @payloadJson, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      displayLabel = excluded.displayLabel,
      payloadJson = excluded.payloadJson,
      updatedAt = excluded.updatedAt
  `);

  const apply = db.transaction((rows: Project[]) => {
    if (rows.length === 0) {
      db.prepare("DELETE FROM project_cache").run();
      return;
    }

    if (removedIds.length > 0) {
      const deleteStmt = db.prepare("DELETE FROM project_cache WHERE id = ?");
      for (const id of removedIds) {
        deleteStmt.run(id);
      }
    }

    for (const project of rows) {
      upsert.run({
        id: project.id,
        displayLabel: project.displayLabel,
        payloadJson: JSON.stringify(project),
        updatedAt: fetchedAt
      });
    }
  });

  apply(projects);
  setSetting(PROJECTS_FETCHED_AT_KEY, fetchedAt);

  return {
    localCountBefore,
    serverCount: projects.length,
    localCountAfter: getProjectsCacheCount(),
    idsChanged,
    addedIds,
    removedIds
  };
}

export type ProjectsDeltaMergeResult = {
  localCountBefore: number;
  localCountAfter: number;
  addedIds: string[];
  updatedIds: string[];
  removedIds: string[];
};

/**
 * Apply an incremental delta to the cache: upsert only the changed projects and
 * delete only the reported removed ids. Rows that are absent from the delta are
 * left untouched (unlike replaceProjectsCache which wipes anything not present).
 */
export function mergeProjectsDelta(
  projects: Project[],
  removedIds: string[],
  fetchedAt: string
): ProjectsDeltaMergeResult {
  const db = getDb();
  const existing = new Set(getProjectCacheIds());
  const localCountBefore = existing.size;
  const addedIds: string[] = [];
  const updatedIds: string[] = [];
  const appliedRemovedIds: string[] = [];

  const upsert = db.prepare(`
    INSERT INTO project_cache (id, displayLabel, payloadJson, updatedAt)
    VALUES (@id, @displayLabel, @payloadJson, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      displayLabel = excluded.displayLabel,
      payloadJson = excluded.payloadJson,
      updatedAt = excluded.updatedAt
  `);
  const deleteStmt = db.prepare("DELETE FROM project_cache WHERE id = ?");

  const apply = db.transaction(() => {
    for (const project of projects) {
      if (existing.has(project.id)) {
        updatedIds.push(project.id);
      } else {
        addedIds.push(project.id);
      }
      upsert.run({
        id: project.id,
        displayLabel: project.displayLabel,
        payloadJson: JSON.stringify(project),
        updatedAt: fetchedAt
      });
    }
    for (const id of removedIds) {
      if (existing.has(id)) {
        deleteStmt.run(id);
        appliedRemovedIds.push(id);
      }
    }
  });

  apply();
  setSetting(PROJECTS_FETCHED_AT_KEY, fetchedAt);

  return {
    localCountBefore,
    localCountAfter: getProjectsCacheCount(),
    addedIds,
    updatedIds,
    removedIds: appliedRemovedIds
  };
}

/** @deprecated Use replaceProjectsCache */
export function mergeProjectsCache(projects: Project[], fetchedAt: string): number {
  return replaceProjectsCache(projects, fetchedAt).localCountAfter;
}

export function clearProjectsCache(): void {
  const db = getDb();
  db.prepare("DELETE FROM project_cache").run();
  setSetting(PROJECTS_FETCHED_AT_KEY, "");
  clearProjectsVersionFingerprint();
}
