import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import {
  getProjectsCacheCount,
  getProjectsFetchedAt,
  loadProjectsCache,
  replaceProjectsCache
} from "../db/projects-cache";
import type { RoleProject } from "../config/role-project-catalog";
import { readCachedUserRoles } from "../api/client";
import { refreshAuthSession, readAuthContext, type AuthContext } from "./auth-session";
import { notifyDesktop } from "./desktop-notifications";

/**
 * Slow safety-net refresh. The project list is fetched on demand (login, when
 * the picker opens, window focus, manual sync), so this only needs to catch
 * background changes occasionally — keeping it long avoids re-paging the whole
 * list every minute (fewer Vercel calls).
 */
export const PROJECT_SYNC_INTERVAL_MS = 15 * 60_000;

export type ProjectSyncResult = {
  projects: RoleProject[];
  roles: string[];
  serverCount: number;
  localCount: number;
  fetchedAt: string | null;
};

type ProjectSyncServiceOptions = {
  window: BrowserWindow;
  resolveVisibleProjects: (apiProjects: api.Project[], roles: string[]) => RoleProject[];
  fetchRoles: (ctx: AuthContext) => Promise<string[]>;
  /**
   * Gate for the periodic timer only. Explicit syncNow() calls (login, picker
   * open, manual refresh) always run. Returning false skips the background
   * tick — e.g. while a session is active the project list isn't needed.
   */
  shouldRunTimerSync?: () => boolean;
};

export class ProjectSyncService {
  private readonly window: BrowserWindow;
  private readonly resolveVisibleProjects: ProjectSyncServiceOptions["resolveVisibleProjects"];
  private readonly fetchRoles: ProjectSyncServiceOptions["fetchRoles"];
  private readonly shouldRunTimerSync: () => boolean;
  private interval: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private lastPublishedKey = "";

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
        logger.error("project-sync-interval-failed", { error });
      });
    }, PROJECT_SYNC_INTERVAL_MS);
    logger.info("project-sync-started", { intervalMs: PROJECT_SYNC_INTERVAL_MS });
  }

  public stop(): void {
    if (!this.interval) {
      return;
    }
    clearInterval(this.interval);
    this.interval = null;
    logger.info("project-sync-stopped");
  }

  public async syncNow(): Promise<ProjectSyncResult> {
    if (this.syncInProgress) {
      return this.buildResultFromCache();
    }

    const ctx = readAuthContext();
    if (!ctx.token && !ctx.sessionCookie) {
      return this.buildResultFromCache();
    }

    this.syncInProgress = true;
    const localCountBefore = getProjectsCacheCount();

    try {
      const apiProjects = await api.getAllProjectsPaginated({
        ...ctx,
        onAuthRefresh: refreshAuthSession
      });
      const roles = await this.fetchRoles(ctx);
      const fetchedAt = new Date().toISOString();
      const cacheResult = replaceProjectsCache(apiProjects, fetchedAt);
      const serverCount = cacheResult.serverCount;

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
        logger.info("projects-cache-unchanged", { serverCount, localCountAfter: cacheResult.localCountAfter });
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
