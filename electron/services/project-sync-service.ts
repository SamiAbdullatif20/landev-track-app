import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import {
  getProjectsCacheCount,
  getProjectsFetchedAt,
  getProjectsVersionFingerprint,
  loadProjectsCache,
  mergeProjectsDelta,
  replaceProjectsCache,
  setProjectsVersionFingerprint
} from "../db/projects-cache";
import type { RoleProject } from "../config/role-project-catalog";
import { readCachedUserRoles } from "../api/client";
import { refreshAuthSession, readAuthContext, type AuthContext } from "./auth-session";
import { notifyDesktop } from "./desktop-notifications";

/** Background check for newly assigned projects — uses a cheap version call plus incremental delta fetch. */
export const PROJECT_SYNC_INTERVAL_MS = 3 * 60_000;

/**
 * Safety-net cooldown for full paginated downloads. Only applies when we cannot
 * cheaply detect changes (no version endpoint) — the normal path uses the cheap
 * version check + incremental delta fetch and is not throttled.
 */
export const PROJECTS_FULL_SYNC_MIN_INTERVAL_MS = 24 * 60 * 60_000;

export type ProjectSyncResult = {
  projects: RoleProject[];
  roles: string[];
  serverCount: number;
  localCount: number;
  fetchedAt: string | null;
  skipped?: boolean;
  /** Version changed but full fetch deferred until daily window elapses. */
  deferredFullFetch?: boolean;
};

export type ProjectSyncOptions = {
  /** Ignore the version fingerprint and always paginate the full list. */
  forceFull?: boolean;
};

type ProjectSyncServiceOptions = {
  window: BrowserWindow;
  resolveVisibleProjects: (apiProjects: api.Project[], roles: string[]) => RoleProject[];
  fetchRoles: (ctx: AuthContext) => Promise<string[]>;
  /** Gate for the background timer only (e.g. skip while a session is active). */
  shouldRunTimerSync?: () => boolean;
};

function versionMatches(
  cached: { hash: string; count: number },
  remote: api.ProjectsVersion
): boolean {
  return cached.hash === remote.hash && cached.count === remote.count;
}

function isWithinFullSyncCooldown(fetchedAt: string | null, nowMs = Date.now()): boolean {
  if (!fetchedAt) {
    return false;
  }
  const fetchedMs = Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedMs)) {
    return false;
  }
  return nowMs - fetchedMs < PROJECTS_FULL_SYNC_MIN_INTERVAL_MS;
}

export class ProjectSyncService {
  private readonly window: BrowserWindow;
  private readonly resolveVisibleProjects: ProjectSyncServiceOptions["resolveVisibleProjects"];
  private readonly fetchRoles: ProjectSyncServiceOptions["fetchRoles"];
  private readonly shouldRunTimerSync: () => boolean;
  private interval: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private lastPublishedKey = "";
  /** When /api/projects/version returns 404, fall back to periodic full fetch. */
  private versionEndpointAvailable = true;
  /** When /api/projects/delta returns 404, fall back to full fetch on change. */
  private deltaEndpointAvailable = true;

  constructor(options: ProjectSyncServiceOptions) {
    this.window = options.window;
    this.resolveVisibleProjects = options.resolveVisibleProjects;
    this.fetchRoles = options.fetchRoles;
    this.shouldRunTimerSync = options.shouldRunTimerSync ?? (() => true);
  }

  public start(): void {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(() => {
      if (!this.shouldRunTimerSync()) {
        return;
      }
      this.syncNow().catch((error) => {
        logger.warn("project-sync-interval-failed", { error });
      });
    }, PROJECT_SYNC_INTERVAL_MS);
    logger.info("project-sync-started", {
      intervalMs: PROJECT_SYNC_INTERVAL_MS,
      skipsWhileSessionActive: true
    });
  }

  public stop(): void {
    if (!this.interval) {
      return;
    }
    clearInterval(this.interval);
    this.interval = null;
    logger.info("project-sync-stopped");
  }

  /** Return the locally cached project list without hitting the network. */
  public getCached(): ProjectSyncResult {
    return this.buildResultFromCache();
  }

  public async syncNow(options: ProjectSyncOptions = {}): Promise<ProjectSyncResult> {
    if (this.syncInProgress) {
      return this.buildResultFromCache();
    }

    const ctx = readAuthContext();
    if (!ctx.token && !ctx.sessionCookie) {
      return this.buildResultFromCache();
    }

    this.syncInProgress = true;
    const localCountBefore = getProjectsCacheCount();
    const forceFull = options.forceFull === true;
    const cachedVersion = getProjectsVersionFingerprint();
    const hasLocalCache = localCountBefore > 0;
    const lastFetchedAt = getProjectsFetchedAt();

    try {
      if (!forceFull && hasLocalCache && this.versionEndpointAvailable) {
        const remoteVersion = await api.fetchProjectsVersion({
          ...ctx,
          onAuthRefresh: refreshAuthSession
        });

        if (remoteVersion === null) {
          this.versionEndpointAvailable = false;
          logger.info("project-sync-version-fallback-full-fetch");
        } else if (cachedVersion && versionMatches(cachedVersion, remoteVersion)) {
          logger.info("project-sync-skipped-unchanged", {
            count: remoteVersion.count,
            hash: remoteVersion.hash
          });
          return { ...this.buildResultFromCache(), skipped: true };
        } else if (this.deltaEndpointAvailable && lastFetchedAt) {
          const incremental = await this.tryIncrementalSync(ctx, lastFetchedAt, remoteVersion);
          if (incremental) {
            return incremental;
          }
          // Delta unavailable or did not reconcile — fall through to a full fetch.
        }
      } else if (
        !forceFull
        && hasLocalCache
        && isWithinFullSyncCooldown(lastFetchedAt)
        && !this.versionEndpointAvailable
      ) {
        logger.info("project-sync-full-fetch-deferred-no-version-endpoint", {
          lastFetchedAt
        });
        return { ...this.buildResultFromCache(), skipped: true, deferredFullFetch: true };
      }

      return await this.runFullSync(ctx, localCountBefore);
    } catch (error) {
      logger.warn("project-sync-failed", {
        error: error instanceof Error ? error.message : "unknown",
        localCount: localCountBefore
      });
      return this.buildResultFromCache();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Cheap incremental path: fetch only the projects changed since the last sync
   * and merge them into the cache without re-downloading the full list. Returns
   * null when the caller should fall back to a full fetch.
   */
  private async tryIncrementalSync(
    ctx: AuthContext,
    sinceIso: string,
    remoteVersion: api.ProjectsVersion
  ): Promise<ProjectSyncResult | null> {
    const delta = await api.fetchProjectsDelta(sinceIso, {
      ...ctx,
      onAuthRefresh: refreshAuthSession
    });

    if (delta === null) {
      this.deltaEndpointAvailable = false;
      logger.info("project-sync-delta-fallback-full-fetch");
      return null;
    }

    const fetchedAt = new Date().toISOString();
    const mergeResult = mergeProjectsDelta(delta.projects, delta.removedIds, fetchedAt);

    // Only trust the incremental merge when it reconciles to the server's count;
    // otherwise the delta missed something and we need a full fetch to be safe.
    if (mergeResult.localCountAfter !== remoteVersion.count) {
      logger.info("project-sync-delta-count-mismatch-full-fetch", {
        localCountAfter: mergeResult.localCountAfter,
        remoteCount: remoteVersion.count,
        added: mergeResult.addedIds.length,
        removed: mergeResult.removedIds.length
      });
      return null;
    }

    setProjectsVersionFingerprint({ hash: remoteVersion.hash, count: remoteVersion.count });

    logger.info("project-sync-delta-applied", {
      added: mergeResult.addedIds.length,
      updated: mergeResult.updatedIds.length,
      removed: mergeResult.removedIds.length,
      localCountAfter: mergeResult.localCountAfter
    });

    if (mergeResult.addedIds.length > 0) {
      void notifyDesktop({
        event: "assignment_alert",
        title: "LANDEV — new project assigned",
        body:
          mergeResult.addedIds.length === 1
            ? "A new project was added to your list."
            : `${mergeResult.addedIds.length} new projects were added to your list.`
      });
    }

    const cached = loadProjectsCache();
    const roles = readCachedUserRoles();
    const visible = this.resolveVisibleProjects(cached, roles);
    this.publish(visible, roles, fetchedAt);
    return {
      projects: visible,
      roles,
      serverCount: remoteVersion.count,
      localCount: mergeResult.localCountAfter,
      fetchedAt
    };
  }

  /** Download the full paginated project list and replace the cache. */
  private async runFullSync(ctx: AuthContext, localCountBefore: number): Promise<ProjectSyncResult> {
    const apiProjects = await api.getAllProjectsPaginated({
      ...ctx,
      onAuthRefresh: refreshAuthSession
    });
    const roles = await this.fetchRoles(ctx);
    const fetchedAt = new Date().toISOString();
    const cacheResult = replaceProjectsCache(apiProjects, fetchedAt);
    const serverCount = cacheResult.serverCount;

    const remoteVersionAfterFetch = await api.fetchProjectsVersion({
      ...ctx,
      onAuthRefresh: refreshAuthSession
    });
    if (remoteVersionAfterFetch) {
      setProjectsVersionFingerprint({
        hash: remoteVersionAfterFetch.hash,
        count: remoteVersionAfterFetch.count
      });
      this.versionEndpointAvailable = true;
    }

    if (cacheResult.idsChanged) {
      logger.info("projects-ids-replaced", {
        serverCount,
        localCountBefore: cacheResult.localCountBefore,
        localCountAfter: cacheResult.localCountAfter,
        addedCount: cacheResult.addedIds.length,
        removedCount: cacheResult.removedIds.length,
        addedIds: cacheResult.addedIds.slice(0, 20),
        removedIds: cacheResult.removedIds.slice(0, 20)
      });
      if (cacheResult.addedIds.length > 0) {
        void notifyDesktop({
          event: "assignment_alert",
          title: "LANDEV — new project assigned",
          body:
            cacheResult.addedIds.length === 1
              ? "A new project was added to your list."
              : `${cacheResult.addedIds.length} new projects were added to your list.`
        });
      }
    } else if (serverCount !== localCountBefore) {
      logger.info("projects-count-diff", {
        serverCount,
        localCountBefore,
        localCountAfter: cacheResult.localCountAfter,
        delta: serverCount - localCountBefore
      });
    } else {
      logger.info("projects-cache-refreshed", {
        serverCount,
        localCountAfter: cacheResult.localCountAfter
      });
    }

    const visible = this.resolveVisibleProjects(apiProjects, roles);
    this.publish(visible, roles, fetchedAt);
    return {
      projects: visible,
      roles,
      serverCount,
      localCount: cacheResult.localCountAfter,
      fetchedAt
    };
  }

  private buildResultFromCache(): ProjectSyncResult {
    const cached = loadProjectsCache();
    const roles = readCachedUserRoles();
    const visible = this.resolveVisibleProjects(cached, roles);
    return {
      projects: visible,
      roles,
      serverCount: cached.length,
      localCount: getProjectsCacheCount(),
      fetchedAt: getProjectsFetchedAt()
    };
  }

  private publish(projects: RoleProject[], roles: string[], fetchedAt: string): void {
    const publishKey = `${roles.join(",")}|${projects.map((project) => project.id).join(",")}`;
    if (publishKey === this.lastPublishedKey) {
      return;
    }
    this.lastPublishedKey = publishKey;
    this.window.webContents.send("tracking:projects-push", {
      projects,
      roles,
      fetchedAt
    });
  }
}
