export {};

type TrackingStatus = {
  active: boolean;
  sessionId: string | null;
  projectId: string | null;
  description: string | null;
  startedAt: string | null;
};

type Project = {
  id: string;
  name: string;
};

type SyncStatus = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  lastSyncAt: string | null;
};

type AppInfo = {
  appName: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  env: string;
  apiBaseUrl: string;
};

declare global {
  interface Window {
    desktopAPI: {
      login: (payload: { username: string; password: string }) => Promise<{ ok: true; roles: string[] }>;
      authStatus: () => Promise<{ authenticated: boolean; roles: string[] }>;
      logout: () => Promise<{ ok: true }>;
      getAppInfo: () => Promise<AppInfo>;
      testConnection: () => Promise<{ reachable: boolean; message: string }>;
      getProjects: () => Promise<{ projects: Project[] }>;
      startSession: (payload: { projectId: string; description: string }) => Promise<{ sessionId: string }>;
      stopSession: (payload: { stoppedAt: string }) => Promise<{ ok: true }>;
      trackEvent: (payload: { type: string; occurredAt: string; metadata?: Record<string, unknown> }) => Promise<{ queued: boolean }>;
      getStatus: () => Promise<TrackingStatus>;
      getSyncStatus: () => Promise<SyncStatus>;
      syncNow: () => Promise<{ ok: true; status?: SyncStatus }>;
      onStatusPush: (cb: (status: TrackingStatus) => void) => () => void;
      onSyncStatusPush: (cb: (status: SyncStatus) => void) => () => void;
    };
  }
}
