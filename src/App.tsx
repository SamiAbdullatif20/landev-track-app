import { useEffect, useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { TrackerScreen } from "./components/TrackerScreen";

type UserProfile = {
  id: string | null;
  name: string;
  username: string;
  email: string | null;
  roles: string[];
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

const idleTracking: TrackingStatus = {
  active: false,
  sessionId: null,
  projectId: null,
  projectName: null,
  description: "",
  draftDescription: "",
  startedAt: null,
  stoppedAt: null,
  todayCompletedMs: 0,
  appsUsed: [],
  status: "idle"
};

export default function App() {
  const [booting, setBooting] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tracking, setTracking] = useState<TrackingStatus>(idleTracking);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await window.desktopAPI.authStatus();
        if (cancelled) return;
        if (status.authenticated && status.profile) {
          setProfile(status.profile);
          setTracking(status.tracking);
        }
      } catch {
        // stay on login
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    return window.desktopAPI.onTrackingStatus((status) => {
      setTracking(status);
    });
  }, [profile]);

  async function handleLogin() {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const result = await window.desktopAPI.login({ username, password });
      setProfile(result.profile);
      setTracking(result.tracking);
      setPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Invalid credentials");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await window.desktopAPI.logout();
    } finally {
      setProfile(null);
      setTracking(idleTracking);
      setPassword("");
    }
  }

  if (booting) {
    return (
      <main className="boot-shell">
        <p className="brand-mark">LANDEV</p>
        <p>Starting…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <LoginScreen
        username={username}
        password={password}
        loading={loginLoading}
        error={loginError}
        onUsername={setUsername}
        onPassword={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <TrackerScreen
      profile={profile}
      tracking={tracking}
      onLogout={handleLogout}
      onTrackingChange={setTracking}
    />
  );
}
