import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { useTrackingStore } from "./store/trackingStore";
import { useActivityTracker } from "./hooks/useActivityTracker";
import { useToasts } from "./hooks/useToasts";
import { toFriendlyMessage } from "./utils/errors";
import { sanitizeDisplayText } from "./utils/sanitize";
import "./App.css";

const DESCRIPTION_MIN_LENGTH = 3;
const DESCRIPTION_MAX_LENGTH = 2000;

function App() {
  const [password, setPassword] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(null);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [stopInfo, setStopInfo] = useState<{
    confirmedBy: "tracking" | "attendance" | "idempotent";
    endpointPath: string;
    status: number | null;
    sessionId: string | null;
    timesheetId: string | null;
    queued: boolean;
  } | null>(null);
  const [appInfo, setAppInfo] = useState<{
    appName: string;
    appVersion: string;
    electronVersion: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    env: string;
    apiBaseUrl: string;
  } | null>(null);
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
  const roles = useAuthStore((s) => s.roles);
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

  useActivityTracker(authStatus === "authenticated" && session.active);

  useEffect(() => {
    window.desktopAPI.getAppInfo().then(setAppInfo).catch(() => undefined);
    window.desktopAPI.getTrackingConsentStatus().then((r) => setConsentAccepted(r.accepted)).catch(() => setConsentAccepted(false));
  }, []);

  const fetchProjectsWithRetry = useCallback(async (attempts = 3): Promise<void> => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const projectResult = await window.desktopAPI.getProjects();
          setProjects(projectResult.projects.map((project) => ({
            id: project.id,
            name: sanitizeDisplayText(project.name),
            projectNumber: project.projectNumber,
            clientName: project.clientName ? sanitizeDisplayText(project.clientName) : null
          })));
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
  }, [setProjects, setProjectsLoading]);

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
          description: statusResult.description ?? "",
          startedAt: statusResult.startedAt
        });
        await fetchProjectsWithRetry();
      } catch (error) {
        setAuthStatus("anonymous");
        setAuthError(toFriendlyMessage(error));
      } finally {
        setAuthLoading(false);
      }
    };

    initialize().catch(() => undefined);

    const unsubscribe = window.desktopAPI.onStatusPush((status) => {
      setSession({
        active: status.active,
        sessionId: status.sessionId,
        projectId: status.projectId ?? "",
        description: status.description ?? "",
        startedAt: status.startedAt
      });
    });

    const unsubscribeSync = window.desktopAPI.onSyncStatusPush((status) => {
      setSyncStatus(status);
    });

    window.desktopAPI.getSyncStatus().then((status) => setSyncStatus(status)).catch(() => undefined);

    return () => {
      unsubscribe();
      unsubscribeSync();
    };
  }, [fetchProjectsWithRetry, setAuthError, setAuthLoading, setAuthStatus, setRoles, setSession]);

  const canStart = useMemo(() => {
    const trimmedDescription = session.description.trim();
    return (
      authStatus === "authenticated" &&
      !session.active &&
      !sessionLoading &&
      session.projectId.trim().length > 0 &&
      trimmedDescription.length >= DESCRIPTION_MIN_LENGTH &&
      trimmedDescription.length <= DESCRIPTION_MAX_LENGTH
    );
  }, [authStatus, session.active, session.description, session.projectId, sessionLoading]);

  const trimmedDescriptionLength = session.description.trim().length;
  const descriptionValidationError =
    trimmedDescriptionLength > 0 && trimmedDescriptionLength < DESCRIPTION_MIN_LENGTH
      ? "Add a short description (min 3 characters)."
      : trimmedDescriptionLength > DESCRIPTION_MAX_LENGTH
        ? `Description is too long (max ${DESCRIPTION_MAX_LENGTH} characters).`
        : null;

  const onTestConnection = async () => {
    setConnectionTesting(true);
    setConnectionMessage(null);
    try {
      const result = await window.desktopAPI.testConnection();
      setConnectionMessage(result.message);
      pushToast(result.reachable ? "success" : "error", result.message);
    } catch (error) {
      const message = toFriendlyMessage(error);
      setConnectionMessage(message);
      pushToast("error", message);
    } finally {
      setConnectionTesting(false);
    }
  };

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
        description: statusResult.description ?? "",
        startedAt: statusResult.startedAt
      });

      await fetchProjectsWithRetry();
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
    setSessionLoading(true);
    setTrackingError(null);
    setStopInfo(null);
    try {
      const result = await window.desktopAPI.startSession({
        projectId: session.projectId,
        description: trimmedDescription
      });
      setSession({ active: true, sessionId: result.sessionId, startedAt: new Date().toISOString() });
      pushToast("success", "Tracking session started.");
    } catch (error) {
      setTrackingError(toFriendlyMessage(error));
      pushToast("error", "Failed to start session.");
    } finally {
      setSessionLoading(false);
    }
  };

  const onStop = async () => {
    if (sessionLoading || !session.active || stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    setSessionLoading(true);
    setTrackingError(null);
    try {
      const result = await window.desktopAPI.stopSession({ stoppedAt: new Date().toISOString() });
      setSession({ active: false, sessionId: null, startedAt: null });
      setStopInfo({
        confirmedBy: result.confirmedBy,
        endpointPath: result.endpointPath,
        status: result.status,
        sessionId: result.sessionId,
        timesheetId: result.timesheetId,
        queued: result.queued
      });
      if (result.queued) {
        pushToast("info", "Queued for sync.");
      } else {
        pushToast("success", "Stopped and synced.");
      }
    } catch (error) {
      setTrackingError(toFriendlyMessage(error));
      pushToast("error", "Failed to stop session.");
    } finally {
      setSessionLoading(false);
      stopInFlightRef.current = false;
    }
  };

  if (authStatus === "unknown" || authLoading) {
    return <main className="screen"><div className="card">Loading...</div></main>;
  }

  return (
    <main className="screen">
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
              <p>To use this app, you must agree to activity tracking and periodic screenshots.</p>
              <p>A screen shot will be taken every few mins.</p>
              <button disabled={consentSubmitting} onClick={onAcceptConsent}>
                {consentSubmitting ? "Saving..." : "I Agree"}
              </button>
            </article>
          </section>
        )}
        <header className="header">
          <h1>LANDev Employee Tracker</h1>
          <div className="sync-indicator">
            {syncStatus.online ? "Online synced" : "Offline queueing"} ? Pending {syncStatus.pendingCount}
            {syncStatus.nextRetryAt ? ` ? Retry ${new Date(syncStatus.nextRetryAt).toLocaleTimeString()}` : ""}
            {syncStatus.lastSyncAt ? ` ? Last sync ${new Date(syncStatus.lastSyncAt).toLocaleTimeString()}` : ""}
            {syncStatus.syncing ? " ? Syncing..." : ""}
          </div>
          <div className="header-actions">
            <button className="ghost" onClick={() => setShowAbout(true)}>About</button>
            {authStatus === "authenticated" && (
              <button className="ghost" disabled={authLoading} onClick={onLogout}>Logout</button>
            )}
          </div>
        </header>

        <section className="card">
          <h2>Connection Settings</h2>
          <p className="meta">API Base URL: {appInfo?.apiBaseUrl ?? "Unavailable"}</p>
          <div className="actions">
            <button className="ghost" disabled={connectionTesting} onClick={onTestConnection}>
              {connectionTesting ? "Testing..." : "Test connection"}
            </button>
          </div>
          {connectionMessage && <p className="meta">{connectionMessage}</p>}
        </section>

        {authStatus === "anonymous" ? (
          <section className="card">
            <h2>Sign In</h2>
            {authError && <p className="error">{authError}</p>}
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button
              disabled={authLoading || username.trim().length < 3 || password.trim().length < 8}
              onClick={onLogin}
            >
              {authLoading ? "Signing in..." : "Login"}
            </button>
          </section>
        ) : (
          <>
          <section className="card">
            <h2>Tracking Session</h2>
            <p className="meta">Role guard: {roles.length > 0 ? roles.join(", ") : "No roles returned"}</p>
            <p className="meta">
              A screen shot will be taken every few mins
            </p>
            {trackingError && <p className="error">{trackingError}</p>}
            <p className="status-chip">Status: {session.active ? "Running" : "Stopped"}</p>
            {stopInfo && (
              <p className="meta">
                Stop sync: {stopInfo.queued ? "Queued" : "Confirmed"} via {stopInfo.endpointPath}
                {stopInfo.status ? ` (HTTP ${stopInfo.status})` : ""}
                {stopInfo.sessionId ? ` ? sessionId ${stopInfo.sessionId}` : ""}
                {stopInfo.timesheetId ? ` ? timesheetId ${stopInfo.timesheetId}` : ""}
              </p>
            )}
            {!session.active && syncStatus.pendingCount > 0 && (
              <p className="warning">
                Pending sync items: {syncStatus.pendingCount}. Last sync {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleTimeString() : "not yet"}.
              </p>
            )}

            <label>
              Project
              <select
                value={session.projectId}
                onChange={(event) => setSession({ projectId: event.target.value })}
                disabled={projectsLoading || session.active || sessionLoading}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.projectNumber ? ` ? #${project.projectNumber}` : ""}
                    {project.clientName ? ` ? ${project.clientName}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {projectsLoading && <p className="meta">Loading projects...</p>}
            {!projectsLoading && projects.length === 0 && !projectsError && (
              <p className="warning">No assigned/active projects for this account.</p>
            )}
            {projectsError && (
              <div className="projects-error-row">
                <p className="error">{projectsError}</p>
                <button className="ghost" onClick={() => fetchProjectsWithRetry()}>Retry project fetch</button>
              </div>
            )}

            <label>
              Description
              <textarea
                value={session.description}
                onChange={(event) => setSession({ description: event.target.value })}
                disabled={session.active || sessionLoading}
                placeholder="Describe what you are working on..."
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
              <span className="hint">Enter work details ({DESCRIPTION_MIN_LENGTH}-{DESCRIPTION_MAX_LENGTH} characters)</span>
              {descriptionValidationError && <span className="error-inline">{descriptionValidationError}</span>}
              <span className="char-counter">{session.description.length}/{DESCRIPTION_MAX_LENGTH}</span>
            </label>

            <div className="actions">
              <button disabled={!canStart} onClick={onStart}>
                {sessionLoading && !session.active ? "Starting..." : "Start"}
              </button>
              <button className="danger" disabled={sessionLoading || !session.active} onClick={onStop}>
                {sessionLoading && session.active ? "Stopping..." : "Stop"}
              </button>
            </div>

            <p className="meta">
              Session ID: {session.sessionId ?? "-"} {session.startedAt ? `| Started: ${new Date(session.startedAt).toLocaleString()}` : ""}
            </p>
          </section>
          </>
        )}

        {showAbout && (
          <section className="about-overlay" onClick={() => setShowAbout(false)}>
            <article className="about-card" onClick={(event) => event.stopPropagation()}>
              <h3>About LANDev Track</h3>
              <p>Version: {appInfo?.appVersion ?? "-"}</p>
              <p>Environment: {appInfo?.env ?? "-"}</p>
              <p>API: {appInfo?.apiBaseUrl ?? "-"}</p>
              <p>Electron: {appInfo?.electronVersion ?? "-"}</p>
              <p>Node: {appInfo?.nodeVersion ?? "-"}</p>
              <p>Platform: {appInfo?.platform ?? "-"} ({appInfo?.arch ?? "-"})</p>
              <button onClick={() => setShowAbout(false)}>Close</button>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
