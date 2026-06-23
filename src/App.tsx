import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { useTrackingStore } from "./store/trackingStore";
import { useToasts } from "./hooks/useToasts";
import { toFriendlyMessage } from "./utils/errors";
import { ProjectSearchSelect } from "./components/ProjectSearchSelect";
import { RecentTasksPanel } from "./components/RecentTasksPanel";
import { LandevLogo } from "./components/LandevLogo";
import { TodayWorkList } from "./components/TodayWorkList";
import { NotificationBell } from "./components/NotificationBell";
import { SoftwareUpdatePrompt } from "./components/SoftwareUpdatePrompt";
import { designerCatalogFallbackProjects, isCatalogProjectId } from "./config/designer-project-fallback";
import { useSessionTimer } from "./hooks/useSessionTimer";
import type { RecentWorkTask } from "./types/recent-task";
import type { ProjectDayTotal, WorkSummary } from "./types/work-summary";
import type { Project } from "./store/trackingStore";
import { formatClockDuration } from "./utils/formatElapsed";
import { sanitizeDisplayText } from "./utils/sanitize";
import {
  canResolveProjectNameForStart,
  resolveProjectNameForStart
} from "./utils/resolveProjectNameForStart";
import "./App.css";

const DESCRIPTION_MIN_LENGTH = 3;
const DESCRIPTION_MAX_LENGTH = 2000;

function App() {
  const [password, setPassword] = useState("");
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(null);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [workSummary, setWorkSummary] = useState<WorkSummary>({
    todayTotalMs: 0,
    todayByProject: [],
    recentTasks: []
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [syncStatus, setSyncStatus] = useState({
    online: true,
    syncing: false,
    pendingCount: 0,
    nextRetryAt: null as string | null,
    lastError: null as string | null,
    lastSyncAt: null as string | null
  });
  const stopInFlightRef = useRef(false);

  const { toasts, pushToast } = useToasts();

  const authStatus = useAuthStore((s) => s.status);
  const username = useAuthStore((s) => s.username);
  const authLoading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const setAuthStatus = useAuthStore((s) => s.setStatus);
  const setUsername = useAuthStore((s) => s.setUsername);
  const setRoles = useAuthStore((s) => s.setRoles);
  const setAuthLoading = useAuthStore((s) => s.setLoading);
  const setAuthError = useAuthStore((s) => s.setError);
  const resetAuth = useAuthStore((s) => s.reset);

  const projects = useTrackingStore((s) => s.projects);
  const projectsLoading = useTrackingStore((s) => s.projectsLoading);
  const sessionLoading = useTrackingStore((s) => s.sessionLoading);
  const session = useTrackingStore((s) => s.session);
  const trackingError = useTrackingStore((s) => s.error);
  const setProjects = useTrackingStore((s) => s.setProjects);
  const setProjectsLoading = useTrackingStore((s) => s.setProjectsLoading);
  const setSessionLoading = useTrackingStore((s) => s.setSessionLoading);
  const setSession = useTrackingStore((s) => s.setSession);
  const setTrackingError = useTrackingStore((s) => s.setError);
  const resetTracking = useTrackingStore((s) => s.reset);

  const sessionTimerLabel = useSessionTimer(session.active, session.startedAt);

  const loadWorkSummary = useCallback(async (options?: { showLoading?: boolean }) => {
    if (authStatus !== "authenticated") {
      setWorkSummary({ todayTotalMs: 0, todayByProject: [], recentTasks: [] });
      return;
    }
    const showLoading = options?.showLoading ?? false;
    if (showLoading) {
      setSummaryLoading(true);
    }
    try {
      const summary = await window.desktopAPI.getWorkSummary();
      setWorkSummary((previous) => {
        if (
          previous.todayTotalMs === summary.todayTotalMs
          && previous.todayByProject.length === summary.todayByProject.length
          && previous.recentTasks.length === summary.recentTasks.length
          && previous.todayByProject.every((item, index) => {
            const next = summary.todayByProject[index];
            return (
              next
              && item.projectId === next.projectId
              && item.totalMs === next.totalMs
              && item.projectName === next.projectName
              && item.lastDescription === next.lastDescription
            );
          })
          && previous.recentTasks.every((item, index) => {
            const next = summary.recentTasks[index];
            return (
              next
              && item.projectId === next.projectId
              && item.description === next.description
              && item.projectName === next.projectName
              && item.lastUsedAt === next.lastUsedAt
            );
          })
        ) {
          return previous;
        }
        return summary;
      });
    } catch {
      setWorkSummary({ todayTotalMs: 0, todayByProject: [], recentTasks: [] });
    } finally {
      if (showLoading) {
        setSummaryLoading(false);
      }
    }
  }, [authStatus]);

  useEffect(() => {
    window.desktopAPI.getTrackingConsentStatus().then((r) => setConsentAccepted(r.accepted)).catch(() => setConsentAccepted(false));
  }, []);

  useEffect(() => {
    window.desktopAPI
      .getNotificationSoundEnabled()
      .then((result) => setNotificationSoundEnabled(result.enabled))
      .catch(() => undefined);
  }, []);

  const applyProjectsPayload = useCallback(
    (projectResult: { projects: Array<Project & { isCatalogDefault?: boolean }>; roles?: string[] }) => {
      if (projectResult.roles?.length) {
        setRoles(projectResult.roles);
      }
      const mapped = (projectResult.projects ?? []).map((project) => ({
        id: project.id,
        name: sanitizeDisplayText(project.name),
        displayLabel: sanitizeDisplayText(project.displayLabel ?? project.name),
        searchLabel: sanitizeDisplayText(project.searchLabel ?? project.name),
        projectNumber: project.projectNumber,
        projectAddress: project.projectAddress ? sanitizeDisplayText(project.projectAddress) : null,
        clientName: project.clientName ? sanitizeDisplayText(project.clientName) : null,
        isNonChargeable: Boolean(project.isNonChargeable),
        isCatalogDefault: Boolean(project.isCatalogDefault)
      }));
      setProjects(mapped.length > 0 ? mapped : designerCatalogFallbackProjects());
    },
    [setProjects, setRoles]
  );

  const fetchProjectsWithRetry = useCallback(async (attempts = 3): Promise<void> => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const projectResult = await window.desktopAPI.getProjects();
          applyProjectsPayload(projectResult);
          return;
        } catch (error) {
          if (attempt === attempts) {
            const message = toFriendlyMessage(error);
            setProjectsError(message);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
        }
      }
    } finally {
      setProjectsLoading(false);
    }
  }, [applyProjectsPayload, setProjectsLoading]);

  useEffect(() => {
    const initialize = async () => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const status = await window.desktopAPI.authStatus();
        if (!status.authenticated) {
          setAuthStatus("anonymous");
          return;
        }

        setAuthStatus("authenticated");
        setRoles(status.roles);
        const statusResult = await window.desktopAPI.getStatus();

        setSession({
          active: statusResult.active,
          sessionId: statusResult.sessionId,
          projectId: statusResult.projectId ?? "",
          projectName: "",
          description: statusResult.description ?? "",
          startedAt: statusResult.startedAt
        });
        await fetchProjectsWithRetry();
        await loadWorkSummary({ showLoading: true });
      } catch (error) {
        setAuthStatus("anonymous");
        setAuthError(toFriendlyMessage(error));
      } finally {
        setAuthLoading(false);
      }
    };

    initialize().catch(() => undefined);

    const unsubscribe = window.desktopAPI.onStatusPush((status) => {
      const current = useTrackingStore.getState().session;
      const next = {
        active: status.active,
        sessionId: status.sessionId,
        projectId: status.projectId ?? current.projectId,
        projectName: current.projectName,
        description: status.description ?? current.description,
        startedAt: status.startedAt
      };
      if (
        current.active === next.active
        && current.sessionId === next.sessionId
        && current.projectId === next.projectId
        && current.projectName === next.projectName
        && current.description === next.description
        && current.startedAt === next.startedAt
      ) {
        return;
      }
      setSession(next);
    });

    const unsubscribeSync = window.desktopAPI.onSyncStatusPush((status) => {
      setSyncStatus(status);
    });

    const unsubscribeProjects = window.desktopAPI.onProjectsPush((payload) => {
      applyProjectsPayload(payload);
      setProjectsError(null);
    });

    window.desktopAPI.getSyncStatus().then((status) => setSyncStatus(status)).catch(() => undefined);

    return () => {
      unsubscribe();
      unsubscribeSync();
      unsubscribeProjects();
    };
  }, [applyProjectsPayload, fetchProjectsWithRetry, loadWorkSummary, setAuthError, setAuthLoading, setAuthStatus, setRoles, setSession]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }
    void loadWorkSummary();
    const intervalId = window.setInterval(() => {
      void loadWorkSummary();
    }, session.active ? 1000 : 5000);
    return () => window.clearInterval(intervalId);
  }, [authStatus, loadWorkSummary, session.active]);

  const canStart = useMemo(() => {
    const trimmedDescription = session.description.trim();
    return (
      authStatus === "authenticated"
      && !session.active
      && !sessionLoading
      && session.projectId.trim().length > 0
      && trimmedDescription.length >= DESCRIPTION_MIN_LENGTH
      && trimmedDescription.length <= DESCRIPTION_MAX_LENGTH
      && canResolveProjectNameForStart(
        session.projectId,
        workSummary,
        projects,
        session.projectName
      )
    );
  }, [
    authStatus,
    session.active,
    session.description,
    session.projectId,
    session.projectName,
    sessionLoading,
    workSummary,
    projects
  ]);

  const projectSelectFallbackLabel = useMemo(() => {
    if (!session.projectId.trim()) {
      return undefined;
    }
    if (projects.some((project) => project.id === session.projectId)) {
      return undefined;
    }
    const resolved = resolveProjectNameForStart(session.projectId, {
      projects,
      sessionProjectName: session.projectName,
      todayByProject: workSummary.todayByProject,
      recentTasks: workSummary.recentTasks
    });
    return resolved ?? undefined;
  }, [projects, session.projectId, session.projectName, workSummary.recentTasks, workSummary.todayByProject]);

  const catalogProjectStartError =
    session.projectId.trim()
    && isCatalogProjectId(session.projectId)
    && !canResolveProjectNameForStart(session.projectId, workSummary, projects, session.projectName)
      ? "Select an admin task type before starting."
      : null;

  const trimmedDescriptionLength = session.description.trim().length;
  const descriptionValidationError =
    trimmedDescriptionLength > 0 && trimmedDescriptionLength < DESCRIPTION_MIN_LENGTH
      ? "Add a short description (min 3 characters)."
      : trimmedDescriptionLength > DESCRIPTION_MAX_LENGTH
        ? `Description is too long (max ${DESCRIPTION_MAX_LENGTH} characters).`
        : null;

  const onAcceptConsent = async () => {
    if (consentSubmitting) return;
    setConsentSubmitting(true);
    try {
      await window.desktopAPI.acceptTrackingConsent();
      setConsentAccepted(true);
      pushToast("success", "Terms accepted.");
    } catch (error) {
      pushToast("error", toFriendlyMessage(error));
    } finally {
      setConsentSubmitting(false);
    }
  };

  const onLogin = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError(null);

    try {
      const loginResult = await window.desktopAPI.login({ username: username.trim(), password });
      setAuthStatus("authenticated");
      setRoles(loginResult.roles);
      setPassword("");

      const statusResult = await window.desktopAPI.getStatus();
      setSession({
        active: statusResult.active,
        sessionId: statusResult.sessionId,
        projectId: statusResult.projectId ?? "",
        projectName: "",
        description: statusResult.description ?? "",
        startedAt: statusResult.startedAt
      });

      await fetchProjectsWithRetry();
      await loadWorkSummary();
      await window.desktopAPI.syncNow();
      pushToast("success", "Logged in successfully.");
    } catch (error) {
      setAuthError(toFriendlyMessage(error));
      pushToast("error", "Login failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const onLogout = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await window.desktopAPI.logout();
      resetTracking();
      resetAuth();
      setProjectsError(null);
      setWorkSummary({ todayTotalMs: 0, todayByProject: [], recentTasks: [] });
      pushToast("info", "Logged out.");
    } catch (error) {
      setAuthError(toFriendlyMessage(error));
      pushToast("error", "Logout failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const onStart = async () => {
    if (sessionLoading || session.active) return;
    const trimmedDescription = session.description.trim();
    if (!session.projectId.trim()) {
      setTrackingError("Select a project before starting work.");
      return;
    }
    if (trimmedDescription.length < DESCRIPTION_MIN_LENGTH || trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setTrackingError("Add a short description (min 3 characters).");
      return;
    }
    const projectName = resolveProjectNameForStart(session.projectId, {
      projects,
      sessionProjectName: session.projectName,
      todayByProject: workSummary.todayByProject,
      recentTasks: workSummary.recentTasks
    });
    if (isCatalogProjectId(session.projectId) && !projectName) {
      setTrackingError("Select an admin task type before starting.");
      return;
    }
    setSessionLoading(true);
    setTrackingError(null);
    try {
      await window.desktopAPI.startSession({
        projectId: session.projectId,
        projectName: projectName ?? undefined,
        isNonChargeable: projects.find((project) => project.id === session.projectId)?.isNonChargeable,
        description: trimmedDescription
      });
      if (projectName) {
        setSession({ projectName });
      }
      pushToast("success", "Tracking started.");
    } catch (error) {
      setTrackingError(toFriendlyMessage(error));
      pushToast("error", "Failed to start session.");
    } finally {
      setSessionLoading(false);
    }
  };

  const applyRecentTask = (task: RecentWorkTask) => {
    if (session.active || sessionLoading) return;
    setSession({
      projectId: task.projectId,
      projectName: task.projectName,
      description: task.description
    });
    setTrackingError(null);
  };

  const applyProjectDayTotal = (item: ProjectDayTotal) => {
    if (session.active || sessionLoading) return;
    setSession({
      projectId: item.projectId,
      projectName: item.projectName,
      description: item.lastDescription || session.description
    });
    setTrackingError(null);
  };

  const onStop = async () => {
    if (sessionLoading || !session.active || stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    setSessionLoading(true);
    setTrackingError(null);
    try {
      await window.desktopAPI.stopSession({ stoppedAt: new Date().toISOString() });
      pushToast("success", "Stopped.");
      await loadWorkSummary();
    } catch (error) {
      const message = toFriendlyMessage(error);
      setTrackingError(message);
      pushToast("error", "Failed to stop session.");
      if (message.toLowerCase().includes("no active session")) {
        const statusResult = await window.desktopAPI.getStatus();
        setSession({
          active: statusResult.active,
          sessionId: statusResult.sessionId,
          projectId: statusResult.projectId ?? session.projectId,
          projectName: session.projectName,
          description: statusResult.description ?? session.description,
          startedAt: statusResult.startedAt
        });
      }
    } finally {
      stopInFlightRef.current = false;
      setSessionLoading(false);
    }
  };

  const onToggleTracking = () => {
    if (session.active) {
      void onStop();
      return;
    }
    void onStart();
  };

  if (authStatus === "unknown" || authLoading) {
    return <main className="screen"><div className="card">Loading...</div></main>;
  }

  return (
    <main className={`screen${authStatus === "anonymous" ? " screen-auth" : ""}`}>
      <div className="toasts">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>{toast.message}</div>
        ))}
      </div>

      <section className="shell">
        {consentAccepted === false && (
          <section className="about-overlay">
            <article className="about-card terms-card">
              <h3>Terms and Consent</h3>
              <p>To use this app, you must agree to activity tracking.</p>
              <button disabled={consentSubmitting} onClick={onAcceptConsent}>
                {consentSubmitting ? "Saving..." : "I Agree"}
              </button>
            </article>
          </section>
        )}

        {authStatus === "anonymous" ? (
          <section className="sign-in-card" aria-labelledby="sign-in-title">
            <header className="sign-in-brand">
              <LandevLogo className="sign-in-logo-img" />
              <h1 id="sign-in-title" className="sign-in-title">
                Tracker
              </h1>
              <p className="sign-in-subtitle">Sign in to track your work day</p>
            </header>

            {authError && (
              <p className="sign-in-alert" role="alert">
                {authError}
              </p>
            )}

            <form
              className="sign-in-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onLogin();
              }}
            >
              <label className="sign-in-field">
                <span className="sign-in-label">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="your.name"
                  disabled={authLoading}
                />
              </label>
              <label className="sign-in-field">
                <span className="sign-in-label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={authLoading}
                />
              </label>
              <button
                type="submit"
                className="sign-in-submit"
                disabled={authLoading || username.trim().length < 3 || password.trim().length < 6}
              >
                {authLoading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="sign-in-hint">Activity tracking starts after you sign in.</p>
          </section>
        ) : (
          <>
            <header className="compact-header">
              <div className="compact-header-left">
                <LandevLogo className="header-logo-img" />
                <div className="compact-header-main">
                <p className="compact-kicker">Worked today</p>
                <p className="daily-total">{formatClockDuration(workSummary.todayTotalMs)}</p>
                <div className="status-row">
                  <span
                    className={`status-dot ${session.active ? "is-tracking" : "is-paused"}`}
                    aria-hidden
                  />
                  <p className="status-label">
                    {session.active ? `Tracking · ${sessionTimerLabel}` : "Paused"}
                  </p>
                </div>
                </div>
              </div>
              <div className="compact-header-actions">
                <NotificationBell />
                <label className="sound-toggle" title="Desktop notification sounds" aria-label="Toggle notification sounds">
                  <input
                    type="checkbox"
                    checked={notificationSoundEnabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      setNotificationSoundEnabled(enabled);
                      void window.desktopAPI.setNotificationSoundEnabled(enabled);
                    }}
                  />
                  <svg className="sound-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  </svg>
                </label>
                <button
                  type="button"
                  className="header-action-btn header-logout-btn"
                  disabled={authLoading}
                  aria-label="Log out of LANDEV Tracker"
                  onClick={onLogout}
                >
                  Log out
                </button>
              </div>
            </header>

            <section className="tracker-card">
              {trackingError && <p className="error">{trackingError}</p>}
              {catalogProjectStartError && <p className="error">{catalogProjectStartError}</p>}
              {descriptionValidationError && <p className="error">{descriptionValidationError}</p>}
              <div className="compose-row">
                <textarea
                  className="compose-input"
                  value={session.description}
                  onChange={(event) => setSession({ description: event.target.value })}
                  disabled={session.active || sessionLoading}
                  placeholder="What are you working on?"
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  rows={2}
                />
                <button
                  type="button"
                  className={`tracker-toggle ${session.active ? "is-tracking" : "is-paused"}`}
                  disabled={sessionLoading || (!session.active && !canStart)}
                  title={session.active ? "Stop tracking" : "Start tracking"}
                  onClick={onToggleTracking}
                >
                  {sessionLoading ? "…" : session.active ? "■" : "▶"}
                </button>
              </div>
              <ProjectSearchSelect
                projects={projects}
                value={session.projectId}
                fallbackLabel={projectSelectFallbackLabel}
                disabled={session.active || sessionLoading}
                loading={projectsLoading}
                onOpen={() => {
                  void fetchProjectsWithRetry(1);
                }}
                onChange={(projectId) => {
                  const selectedProject = projects.find((project) => project.id === projectId);
                  setSession({
                    projectId,
                    projectName: selectedProject
                      ? selectedProject.name || selectedProject.displayLabel
                      : ""
                  });
                  void fetchProjectsWithRetry(1);
                }}
              />
              {projectsLoading && <p className="meta compact-meta">Loading projects...</p>}
              {projectsError && (
                <p className="error">
                  {projectsError}{" "}
                  <button type="button" className="ghost" onClick={() => fetchProjectsWithRetry()}>
                    Retry
                  </button>
                </p>
              )}
              {!syncStatus.online && (
                <p className="warning compact-meta">Offline — {syncStatus.pendingCount} items queued</p>
              )}
            </section>

            <TodayWorkList
              items={workSummary.todayByProject}
              totalMs={workSummary.todayTotalMs}
              disabled={session.active || sessionLoading}
              onResume={applyProjectDayTotal}
            />

            <RecentTasksPanel
              tasks={workSummary.recentTasks}
              loading={summaryLoading}
              disabled={session.active || sessionLoading}
              onSelect={applyRecentTask}
            />
          </>
        )}

      </section>
      <SoftwareUpdatePrompt />
    </main>
  );
}

export default App;
