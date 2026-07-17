import { BrowserWindow } from "electron";
import * as api from "../api/client";
import { logger } from "../config/logger";
import { readAuthContext, refreshAuthSession } from "../services/auth-session";
import { wallElapsedMs } from "../utils/wall-clock";
import {
  clearLocalSession,
  getTodayCompletedMs,
  listRecentProjects,
  readLocalSession,
  recordWorkLogEntry,
  touchRecentProject,
  writeLocalSession
} from "../db/local-store";
import { TimeBadgeOverlay } from "../overlay/time-badge";
import { AppUsageTracker, type AppUsageSnapshot } from "./app-usage-tracker";
import { ScreenshotScheduler } from "./screenshot-scheduler";

export type TrackingStatusPayload = {
  active: boolean;
  sessionId: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string;
  draftDescription: string;
  startedAt: string | null;
  stoppedAt: string | null;
  /** Completed sessions today (excludes live active segment). */
  todayCompletedMs: number;
  appsUsed: AppUsageSnapshot[];
  status: "idle" | "tracking" | "starting" | "stopping";
};

function clientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function authOptions(): api.AuthAwareRequestOptions {
  return {
    ...readAuthContext(),
    onAuthRefresh: refreshAuthSession
  };
}

export class TrackingController {
  private readonly window: BrowserWindow;
  private readonly screenshots = new ScreenshotScheduler();
  private readonly apps = new AppUsageTracker();
  private readonly badge: TimeBadgeOverlay;
  private statusPhase: TrackingStatusPayload["status"] = "idle";
  private stoppedAt: string | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private appsPublishTimer: NodeJS.Timeout | null = null;
  private badgeTimer: NodeJS.Timeout | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.badge = new TimeBadgeOverlay(() => (this.window.isDestroyed() ? null : this.window));
    this.startBadgeTicker();
  }

  private refreshBadge(): void {
    const local = readLocalSession();
    this.badge.update({
      active: local.active === 1,
      completedMs: getTodayCompletedMs(),
      startedAt: local.startedAt
    });
  }

  private startBadgeTicker(): void {
    // Only re-sync anchors occasionally; the badge ticks by itself.
    if (this.badgeTimer) return;
    this.badgeTimer = setInterval(() => {
      if (readLocalSession().active === 1) {
        this.refreshBadge();
      }
    }, 15_000);
  }

  private stopBadgeTicker(): void {
    if (this.badgeTimer) {
      clearInterval(this.badgeTimer);
      this.badgeTimer = null;
    }
  }

  startBackgroundSync(): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => {
      void this.screenshots.flushQueue();
      void this.apps.flushEvents(authOptions());
    }, 30_000);
    if (!this.appsPublishTimer) {
      this.appsPublishTimer = setInterval(() => {
        if (readLocalSession().active === 1) {
          this.publishStatus();
        }
      }, 5_000);
    }
  }

  stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.appsPublishTimer) {
      clearInterval(this.appsPublishTimer);
      this.appsPublishTimer = null;
    }
  }

  getStatus(): TrackingStatusPayload {
    const local = readLocalSession();
    return {
      active: local.active === 1,
      sessionId: local.sessionId,
      projectId: local.projectId,
      projectName: local.projectName,
      description: local.description,
      draftDescription: local.draftDescription,
      startedAt: local.startedAt,
      stoppedAt: this.stoppedAt,
      todayCompletedMs: getTodayCompletedMs(),
      appsUsed: this.apps.getTodayApps(),
      status: local.active === 1 ? (this.statusPhase === "starting" ? "starting" : "tracking") : this.statusPhase
    };
  }

  publishStatus(): void {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send("tracking:status", this.getStatus());
    }
    this.refreshBadge();
  }

  saveDraftDescription(description: string): void {
    const local = readLocalSession();
    writeLocalSession({
      active: local.active,
      draftDescription: description,
      description: local.active === 1 ? description : local.description
    });
  }

  async resumeIfNeeded(): Promise<void> {
    const local = readLocalSession();
    if (local.active !== 1 || !local.startedAt) {
      return;
    }
    this.statusPhase = "tracking";
    this.stoppedAt = null;
    const startedAtMs = Date.parse(local.startedAt);
    this.screenshots.start(
      {
        projectId: local.projectId,
        sessionId: local.sessionId
      },
      {
        sessionStartedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : undefined
      }
    );
    this.apps.start({
      sessionId: local.sessionId,
      projectId: local.projectId,
      startedAt: local.startedAt,
      clientTimeZone: clientTimeZone()
    });
    this.publishStatus();
    logger.info("tracking-session-resumed", {
      sessionId: local.sessionId,
      startedAt: local.startedAt
    });
  }

  async start(input: {
    projectId: string;
    projectName: string;
    description: string;
  }): Promise<TrackingStatusPayload> {
    const local = readLocalSession();
    if (local.active === 1) {
      throw new Error("A tracking session is already active.");
    }
    const description = input.description.trim();
    if (!input.projectId.trim()) {
      throw new Error("Select a project before starting.");
    }
    if (description.length < 3) {
      throw new Error("Enter a short work description (min 3 characters).");
    }

    this.statusPhase = "starting";
    this.stoppedAt = null;
    const startedAt = new Date().toISOString();

    writeLocalSession({
      active: 1,
      sessionId: null,
      projectId: input.projectId,
      projectName: input.projectName,
      description,
      draftDescription: description,
      startedAt
    });
    touchRecentProject(input.projectId, input.projectName, startedAt);
    this.screenshots.start({
      projectId: input.projectId,
      sessionId: null
    });
    this.apps.start({
      sessionId: null,
      projectId: input.projectId,
      startedAt,
      clientTimeZone: clientTimeZone()
    });
    this.publishStatus();

    try {
      const remote = await api.startTrackingSession(
        {
          projectId: input.projectId,
          projectName: input.projectName,
          description,
          clientTimeZone: clientTimeZone(),
          startTimeUtc: startedAt
        },
        authOptions()
      );
      let sessionId = remote.sessionId;
      if (!sessionId) {
        sessionId = await api.fetchActiveSessionId(authOptions());
      }
      writeLocalSession({
        active: 1,
        sessionId,
        projectId: input.projectId,
        projectName: input.projectName,
        description,
        draftDescription: description,
        startedAt
      });
      this.screenshots.updateContext({ sessionId });
      this.apps.updateContext({ sessionId });
      this.statusPhase = "tracking";
      this.publishStatus();
      return this.getStatus();
    } catch (error) {
      logger.warn("tracking-start-remote-deferred", {
        error: error instanceof Error ? error.message : "unknown"
      });
      this.statusPhase = "tracking";
      this.publishStatus();
      return this.getStatus();
    }
  }

  async stop(): Promise<TrackingStatusPayload> {
    const local = readLocalSession();
    if (local.active !== 1 || !local.startedAt) {
      throw new Error("No active tracking session.");
    }
    this.statusPhase = "stopping";
    this.publishStatus();
    const stoppedAt = new Date().toISOString();
    this.stoppedAt = stoppedAt;
    const startedMs = Date.parse(local.startedAt);
    const stoppedMs = Date.parse(stoppedAt);
    const durationMs =
      Number.isFinite(startedMs) && Number.isFinite(stoppedMs)
        ? wallElapsedMs(startedMs, stoppedMs)
        : undefined;

    this.apps.stop(true);
    this.screenshots.stop();
    await this.screenshots.flushQueue();
    await this.apps.flushEvents(authOptions());

    try {
      let sessionId = local.sessionId;
      if (!sessionId) {
        try {
          const remote = await api.startTrackingSession(
            {
              projectId: local.projectId ?? "",
              projectName: local.projectName ?? undefined,
              description: local.description,
              clientTimeZone: clientTimeZone(),
              startTimeUtc: local.startedAt
            },
            authOptions()
          );
          sessionId = remote.sessionId ?? (await api.fetchActiveSessionId(authOptions()));
        } catch {
          sessionId = await api.fetchActiveSessionId(authOptions());
        }
      }
      await api.stopTrackingSession(
        {
          sessionId,
          projectId: local.projectId,
          projectName: local.projectName,
          startedAt: local.startedAt,
          stoppedAt,
          durationMs,
          clientTimeZone: clientTimeZone(),
          description: local.description
        },
        authOptions()
      );
    } catch (error) {
      logger.warn("tracking-stop-remote-failed", {
        error: error instanceof Error ? error.message : "unknown"
      });
    }

    if (local.projectId) {
      touchRecentProject(local.projectId, local.projectName ?? local.projectId, stoppedAt);
    }
    if (typeof durationMs === "number" && durationMs > 0 && local.projectId) {
      recordWorkLogEntry({
        projectId: local.projectId,
        projectName: local.projectName ?? local.projectId,
        startedAt: local.startedAt,
        stoppedAt,
        durationMs,
        sessionId: local.sessionId
      });
    }
    clearLocalSession();
    this.statusPhase = "idle";
    this.publishStatus();
    return this.getStatus();
  }

  listRecentProjects() {
    return listRecentProjects();
  }

  dispose(): void {
    this.apps.stop(false);
    this.screenshots.stop();
    this.stopBackgroundSync();
    this.stopBadgeTicker();
    this.badge.dispose();
  }
}
