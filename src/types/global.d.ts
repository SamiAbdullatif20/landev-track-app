export {};

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

declare global {
  interface Window {
    desktopAPI: {
      login: (payload: {
        username: string;
        password: string;
      }) => Promise<{ ok: true; profile: UserProfile; tracking: TrackingStatus }>;
      logout: () => Promise<{ ok: true }>;
      authStatus: () => Promise<{
        authenticated: boolean;
        profile: UserProfile | null;
        tracking: TrackingStatus;
      }>;
      testConnection: () => Promise<{ reachable: boolean; message: string }>;
      getAppInfo: () => Promise<{
        appName: string;
        appVersion: string;
        env: string;
        apiBaseUrl: string;
      }>;
      getProjects: () => Promise<{ projects: Project[] }>;
      getTrackingStatus: () => Promise<TrackingStatus>;
      startTracking: (payload: {
        projectId: string;
        projectName: string;
        description: string;
      }) => Promise<TrackingStatus>;
      stopTracking: () => Promise<TrackingStatus>;
      saveDescription: (description: string) => Promise<{ ok: true }>;
      getRecentProjects: () => Promise<{
        projects: Array<{ projectId: string; projectName: string; lastWorkedAt: string }>;
      }>;
      onTrackingStatus: (cb: (status: TrackingStatus) => void) => () => void;
    };
  }
}
