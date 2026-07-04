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
};

/**
 * Project sync is on-demand only: it runs once on boot/login and whenever the
 * user presses the manual "Sync" button (or opens the picker). There is no
 * background timer — projects rarely change and re-paging the whole list on a
 * schedule wastes Vercel calls.
 */
export class ProjectSyncService {
  private readonly window: BrowserWindow;
  private readonly resolveVisibleProjects: ProjectSyncServiceOptions["resolveVisibleProjects"];
  private readonly fetchRoles: ProjectSyncServiceOptions["fetchRoles"];
  private syncInProgress = false;
  private lastPublishedKey = "";

  constructor(options: ProjectSyncServiceOptions) {
    this.window = options.window;
    this.resolveVisibleProjects = options.resolveVisibleProjects;
    this.fetchRoles = options.fetchRoles;
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
