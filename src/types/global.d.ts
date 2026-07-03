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
  displayLabel: string;
  searchLabel: string;
  projectNumber: string | null;
  projectAddress: string | null;
  clientName: string | null;
  isNonChargeable?: boolean;
  isCatalogDefault?: boolean;
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

type StopSessionResult = {
  ok: true;
  queued: boolean;
  endpointPath: string;
  status: number | null;
  confirmedBy: "tracking" | "attendance" | "idempotent";
  sessionId: string | null;
  timesheetId: string | null;
  responsePreview: string | null;
};

type TrackingDebugSnapshot = {
  counters: {
    totalCaptured: number;
    totalSynced: number;
    missingWindowTitleCount: number;
    fallbackAppNameCount: number;
    normalizedAppNameCount: number;
  };
  lastSync: {
    ok: boolean;
    statusCode: number | null;
    message: string;
    at: string | null;
  };
  events: Array<{
    capturedAt: string;
    eventId: string;
    eventType: string;
    rawApplication: string;
    rawWindowTitle: string;
    processName: string;
    application: string;
    hasWindowTitle: boolean;
    hasForegroundWindowHandle: boolean;
    source: string;
    windowReasonCode: string | null;
  }>;
};

declare global {
  interface Window {
    desktopAPI: {
      login: (payload: { username: string; password: string }) => Promise<{ ok: true; roles: string[] }>;
      authStatus: () => Promise<{ authenticated: boolean; roles: string[] }>;
      logout: () => Promise<{ ok: true }>;
      getAppInfo: () => Promise<AppInfo>;
      openExternalUrl: (url: string) => Promise<{ ok: true }>;
      testConnection: () => Promise<{ reachable: boolean; message: string }>;
      getProjects: () => Promise<{ projects: Project[]; roles?: string[] }>;
      onProjectsPush: (
        cb: (payload: { projects: Project[]; roles: string[]; fetchedAt: string }) => void
      ) => () => void;
      getNotificationSoundEnabled: () => Promise<{ enabled: boolean }>;
      setNotificationSoundEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>;
      getAppUpdateStatus: () => Promise<import("./app-update").AppUpdateStatus>;
      checkForAppUpdates: () => Promise<import("./app-update").AppUpdateStatus>;
      retryAppUpdate: () => Promise<import("./app-update").AppUpdateStatus>;
      downloadAppUpdate: () => Promise<import("./app-update").AppUpdateStatus>;
      installAppUpdate: () => Promise<{ ok: true }>;
      onAppUpdateStatusPush: (cb: (status: import("./app-update").AppUpdateStatus) => void) => () => void;
      getRecentTasks: () => Promise<import("./recent-task").RecentWorkTask[]>;
      getWorkSummary: () => Promise<import("./work-summary").WorkSummary>;
      startSession: (payload: {
        projectId: string;
        projectName?: string;
        isNonChargeable?: boolean;
        description: string;
      }) => Promise<{ sessionId: string | null }>;
      stopSession: (payload: { stoppedAt: string }) => Promise<StopSessionResult>;
      trackEvent: (payload: { type: string; occurredAt: string; metadata?: Record<string, unknown> }) => Promise<{ queued: boolean }>;
      getStatus: () => Promise<TrackingStatus>;
      getSyncStatus: () => Promise<SyncStatus>;
      getTrackingDebugEvents: () => Promise<TrackingDebugSnapshot>;
      getTrackingConsentStatus: () => Promise<{ accepted: boolean }>;
      acceptTrackingConsent: () => Promise<{ accepted: true }>;
      syncNow: () => Promise<{ ok: true; status?: SyncStatus }>;
      onStatusPush: (cb: (status: TrackingStatus) => void) => () => void;
      onSyncStatusPush: (cb: (status: SyncStatus) => void) => () => void;
    };
  }
}
