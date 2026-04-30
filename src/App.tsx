import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { useTrackingStore } from "./store/trackingStore";
import { useActivityTracker } from "./hooks/useActivityTracker";
import { useToasts } from "./hooks/useToasts";
import { toFriendlyMessage } from "./utils/errors";
import { sanitizeDisplayText } from "./utils/sanitize";
import "./App.css";

const DESCRIPTION_MIN_LENGTH = 10;

function App() {
  const [password, setPassword] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
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
  }, []);

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
        const [statusResult, projectResult] = await Promise.all([
          window.desktopAPI.getStatus(),
          window.desktopAPI.getProjects()
        ]);

        setSession({
          active: statusResult.active,
          sessionId: statusResult.sessionId,
          projectId: statusResult.projectId ?? "",
          description: statusResult.description ?? "",
          startedAt: statusResult.startedAt
        });
        setProjects(projectResult.projects);
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
  }, [setAuthError, setAuthLoading, setAuthStatus, setProjects, setRoles, setSession]);

  const canStart = useMemo(() => {
    return (
      authStatus === "authenticated" &&
      !session.active &&
      !sessionLoading &&
      session.projectId.trim().length > 0 &&
      session.description.trim().length >= DESCRIPTION_MIN_LENGTH
    );
  }, [authStatus, session.active, session.description, session.projectId, sessionLoading]);

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

  const onLogin = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError(null);

    try {
      const loginResult = await window.desktopAPI.login({ username: username.trim(), password });
      setAuthStatus("authenticated");
      setRoles(loginResult.roles);
      setPassword("");

      setProjectsLoading(true);
      const [projectResult, statusResult] = await Promise.all([
        window.desktopAPI.getProjects(),
        window.desktopAPI.getStatus()
      ]);
      setProjects(projectResult.projects.map((project) => ({
        id: project.id,
        name: sanitizeDisplayText(project.name)
      })));
      setSession({
        active: statusResult.active,
        sessionId: statusResult.sessionId,
        projectId: statusResult.projectId ?? "",
        description: statusResult.description ?? "",
        startedAt: statusResult.startedAt
      });

      await window.desktopAPI.syncNow();
      pushToast("success", "Logged in successfully.");
    } catch (error) {
      setAuthError(toFriendlyMessage(error));
      pushToast("error", "Login failed.");
    } finally {
      setProjectsLoading(false);
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
    setSessionLoading(true);
    setTrackingError(null);
    try {
      const result = await window.desktopAPI.startSession({
        projectId: session.projectId,
        description: session.description.trim()
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
    if (sessionLoading || !session.active) return;
    setSessionLoading(true);
    setTrackingError(null);
    setSession({ active: false, sessionId: null, startedAt: null });
    try {
      await window.desktopAPI.stopSession({ stoppedAt: new Date().toISOString() });
      pushToast("success", "Tracking session stopped.");
    } catch (error) {
      setTrackingError(toFriendlyMessage(error));
      pushToast("error", "Failed to stop session.");
    } finally {
      setSessionLoading(false);
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
        <header className="header">
          <h1>LANDev Employee Tracker</h1>
          <div className="sync-indicator">
            {syncStatus.online ? "Online synced" : "Offline queueing"} � Pending {syncStatus.pendingCount}
            {syncStatus.nextRetryAt ? ` � Retry ${new Date(syncStatus.nextRetryAt).toLocaleTimeString()}` : ""}
            {syncStatus.lastSyncAt ? ` � Last sync ${new Date(syncStatus.lastSyncAt).toLocaleTimeString()}` : ""}
            {syncStatus.syncing ? " � Syncing..." : ""}
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
          <section className="card">
            <h2>Tracking Session</h2>
            <p className="meta">Role guard: {roles.length > 0 ? roles.join(", ") : "No roles returned"}</p>
            {trackingError && <p className="error">{trackingError}</p>}
            <p className="status-chip">Status: {session.active ? "Running" : "Stopped"}</p>

            <label>
              Project
              <select
                value={session.projectId}
                onChange={(event) => setSession({ projectId: event.target.value })}
                disabled={projectsLoading || session.active || sessionLoading}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>

            <label>
              Description
              <textarea
                value={session.description}
                onChange={(event) => setSession({ description: event.target.value })}
                disabled={session.active || sessionLoading}
                placeholder="Describe what you are working on..."
              />
              <span className="hint">Minimum {DESCRIPTION_MIN_LENGTH} characters</span>
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
