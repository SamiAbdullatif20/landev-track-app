import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectPicker } from "./ProjectPicker";
import { formatElapsed, primaryRoleLabel } from "../utils/format";
import { liveTodayElapsedMs, wallElapsedMs } from "../utils/wall-clock";

type UserProfile = {
  id: string | null;
  name: string;
  username: string;
  email: string | null;
  roles: string[];
};

type Project = {
  id: string;
  name: string;
  displayLabel: string;
  searchLabel: string;
  projectNumber: string | null;
  projectAddress: string | null;
  clientName: string | null;
};

type TrackingStatus = {
  active: boolean;
  sessionId: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string;
  draftDescription: string;
  startedAt: string | null;
  stoppedAt: string | null;
  todayCompletedMs: number;
  appsUsed: Array<{ displayName: string; processName: string | null; seconds: number }>;
  status: "idle" | "tracking" | "starting" | "stopping";
};

type Props = {
  profile: UserProfile;
  tracking: TrackingStatus;
  onLogout: () => void;
  onTrackingChange: (status: TrackingStatus) => void;
};

export function TrackerScreen({ profile, tracking, onLogout, onTrackingChange }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectId, setProjectId] = useState(tracking.projectId ?? "");
  const [description, setDescription] = useState(
    tracking.active ? tracking.description || tracking.draftDescription : tracking.draftDescription
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  /** Freeze completed-today baseline when a session starts so status polls can't double-count live time. */
  const sessionBaselineRef = useRef<{ startedAt: string; completedMs: number } | null>(null);
  const [recentProjects, setRecentProjects] = useState<
    Array<{ projectId: string; projectName: string; lastWorkedAt: string }>
  >([]);

  async function refreshRecentProjects() {
    try {
      const result = await window.desktopAPI.getRecentProjects();
      setRecentProjects(result.projects);
    } catch {
      // keep previous list
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProjectsLoading(true);
      try {
        const result = await window.desktopAPI.getProjects();
        if (!cancelled) setProjects(result.projects);
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : "Failed to load projects");
        }
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    })();
    void refreshRecentProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshRecentProjects();
  }, [tracking.active, tracking.projectId, tracking.stoppedAt]);

  useEffect(() => {
    setProjectId(tracking.projectId ?? "");
    setDescription(
      tracking.active ? tracking.description || tracking.draftDescription : tracking.draftDescription
    );
  }, [
    tracking.active,
    tracking.projectId,
    tracking.description,
    tracking.draftDescription,
    tracking.sessionId
  ]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;

    const tick = () => {
      if (cancelled) return;
      setNow(Date.now());
      // Align to the next whole second so the display stays in sync with wall clock.
      const delay = Math.max(50, 1000 - (Date.now() % 1000));
      timeoutId = window.setTimeout(tick, delay);
    };

    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (tracking.active && tracking.startedAt) {
      if (sessionBaselineRef.current?.startedAt !== tracking.startedAt) {
        sessionBaselineRef.current = {
          startedAt: tracking.startedAt,
          completedMs: Math.max(0, tracking.todayCompletedMs ?? 0)
        };
      }
    } else {
      sessionBaselineRef.current = null;
    }
  }, [tracking.active, tracking.startedAt, tracking.todayCompletedMs]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void window.desktopAPI.saveDescription(description).catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [description]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projects, projectId]
  );

  const sessionElapsedMs = useMemo(() => {
    if (!tracking.active || !tracking.startedAt) return 0;
    const start = Date.parse(tracking.startedAt);
    return wallElapsedMs(start, now);
  }, [tracking.active, tracking.startedAt, now]);

  const todayTotalMs = useMemo(() => {
    if (!tracking.active || !tracking.startedAt) {
      return Math.max(0, tracking.todayCompletedMs ?? 0);
    }
    const completed =
      sessionBaselineRef.current?.startedAt === tracking.startedAt
        ? sessionBaselineRef.current.completedMs
        : Math.max(0, tracking.todayCompletedMs ?? 0);
    return completed + liveTodayElapsedMs(tracking.startedAt, now);
  }, [tracking.active, tracking.startedAt, tracking.todayCompletedMs, now]);

  const statusLabel =
    tracking.status === "starting"
      ? "Starting…"
      : tracking.status === "stopping"
        ? "Stopping…"
        : tracking.active
          ? "Tracking"
          : "Idle";

  const canStart =
    !tracking.active &&
    tracking.status === "idle" &&
    Boolean(projectId) &&
    description.trim().length >= 3 &&
    !busy &&
    !projectsLoading;

  const canStop = tracking.active && tracking.status === "tracking" && !busy;

  async function handleStart() {
    if (!canStart) return;
    const fromList = selectedProject;
    const fromRecent = recentProjects.find((item) => item.projectId === projectId);
    const resolvedId = fromList?.id ?? fromRecent?.projectId;
    const resolvedName =
      fromList?.name || fromList?.displayLabel || fromRecent?.projectName || "";
    if (!resolvedId || !resolvedName) return;
    setBusy(true);
    setActionError(null);
    try {
      const next = await window.desktopAPI.startTracking({
        projectId: resolvedId,
        projectName: resolvedName,
        description
      });
      onTrackingChange(next);
      await refreshRecentProjects();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to start tracking");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (!canStop) return;
    setBusy(true);
    setActionError(null);
    try {
      const next = await window.desktopAPI.stopTracking();
      onTrackingChange(next);
      await refreshRecentProjects();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to stop tracking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="tracker-shell">
      <header className="tracker-header">
        <div>
          <p className="brand-mark">LANDEV Track</p>
          <p className="user-line">
            <strong>{profile.name || profile.username}</strong>
            <span>{primaryRoleLabel(profile.roles)}</span>
          </p>
        </div>
        <button type="button" className="ghost-btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      <section className="tracking-hero">
        <div>
          <p className="eyebrow">{tracking.active ? "THIS SESSION" : "WORKED TODAY"}</p>
          <p className="live-timer">
            {formatElapsed(tracking.active ? sessionElapsedMs : todayTotalMs)}
          </p>
          {tracking.active && (
            <p className="today-subtotal">Today {formatElapsed(todayTotalMs)}</p>
          )}
        </div>
        <div className={`status-pill is-${tracking.active ? "active" : "idle"}`}>{statusLabel}</div>
      </section>

      <section className="control-card">
        <label className="field-label" htmlFor="work-description">
          What are you working on?
        </label>
        <div className="description-wrap">
          <textarea
            id="work-description"
            rows={3}
            value={description}
            disabled={busy || tracking.status === "stopping"}
            placeholder="Describe your work…"
            onChange={(event) => setDescription(event.target.value)}
          />
          <button
            type="button"
            className={`track-toggle-btn ${tracking.active ? "is-tracking" : "is-idle"}`}
            disabled={tracking.active ? !canStop : !canStart}
            aria-label={tracking.active ? "Stop tracking" : "Start tracking"}
            onClick={() => {
              if (tracking.active) {
                void handleStop();
              } else {
                void handleStart();
              }
            }}
          >
            {tracking.active ? "■" : "▶"}
          </button>
        </div>

        <label className="field-label">Tracking for</label>
        <ProjectPicker
          projects={projects}
          value={projectId}
          loading={projectsLoading}
          disabled={tracking.active || busy}
          onChange={setProjectId}
        />
        {actionError && <p className="form-error">{actionError}</p>}
      </section>

      <section className="recent-card">
        <span className="field-label">Recently worked</span>
        {recentProjects.length === 0 ? (
          <p className="recent-empty">No projects in the last 24 hours</p>
        ) : (
          <ul className="recent-list">
            {recentProjects.map((item) => {
              const matched = projects.find((project) => project.id === item.projectId);
              const label =
                matched?.name || matched?.displayLabel || item.projectName;
              return (
              <li key={item.projectId}>
                <button
                  type="button"
                  className={`recent-item ${item.projectId === projectId ? "is-selected" : ""}`}
                  disabled={tracking.active || busy}
                  onClick={() => setProjectId(item.projectId)}
                >
                  <strong>{label}</strong>
                  <span>
                    {new Date(item.lastWorkedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </button>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
