import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./ipc/channels";

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

type RecentWorkTask = {
  projectId: string;
  projectName: string;
  description: string;
  isNonChargeable: boolean;
  lastUsedAt: string;
};

type ProjectDayTotal = {
  projectId: string;
  projectName: string;
  totalMs: number;
  lastDescription: string;
};

type WorkSummary = {
  todayTotalMs: number;
  todayByProject: ProjectDayTotal[];
  recentTasks: RecentWorkTask[];
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

type AppUpdateStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available"; version: string; currentVersion: string }
  | { phase: "downloading"; percent: number }
  | { phase: "ready"; version: string }
  | { phase: "error"; message: string };

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

contextBridge.exposeInMainWorld("desktopAPI", {
  login: (payload: { username: string; password: string }) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, payload) as Promise<{ ok: true; roles: string[] }>,
  authStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_STATUS) as Promise<{ authenticated: boolean; roles: string[] }>,
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO) as Promise<AppInfo>,
  openExternalUrl: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url) as Promise<{ ok: true }>,
  testConnection: () => ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_TEST) as Promise<{ reachable: boolean; message: string }>,
  getProjects: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRACKING_PROJECTS) as Promise<{ projects: Project[]; roles: string[] }>,
  getRecentTasks: () => ipcRenderer.invoke(IPC_CHANNELS.TRACKING_RECENT_TASKS) as Promise<RecentWorkTask[]>,
  getWorkSummary: () => ipcRenderer.invoke(IPC_CHANNELS.TRACKING_WORK_SUMMARY) as Promise<WorkSummary>,
  startSession: (payload: {
    projectId: string;
    projectName?: string;
    isNonChargeable?: boolean;
    description: string;
  }) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_START, payload) as Promise<{ sessionId: string | null }>,
  stopSession: (payload: { stoppedAt: string }) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_STOP, payload) as Promise<StopSessionResult>,
  trackEvent: (payload: { type: string; occurredAt: string; metadata?: Record<string, unknown> }) => ipcRenderer.invoke(IPC_CHANNELS.TRACKING_EVENT, payload),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_STATUS) as Promise<TrackingStatus>,
  getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.TRACKING_SYNC_STATUS) as Promise<SyncStatus>,
  getTrackingDebugEvents: () => ipcRenderer.invoke(IPC_CHANNELS.TRACKING_DEBUG_LAST_EVENTS) as Promise<TrackingDebugSnapshot>,
  getTrackingConsentStatus: () => ipcRenderer.invoke(IPC_CHANNELS.TRACKING_CONSENT_STATUS) as Promise<{ accepted: boolean }>,
  acceptTrackingConsent: () => ipcRenderer.invoke(IPC_CHANNELS.TRACKING_CONSENT_ACCEPT) as Promise<{ accepted: true }>,
  syncNow: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_NOW),
  getNotificationSoundEnabled: () =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_SOUND_ENABLED_GET) as Promise<{ enabled: boolean }>,
  setNotificationSoundEnabled: (enabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_SOUND_ENABLED_SET, enabled) as Promise<{ enabled: boolean }>,
  getWebNotificationsStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.WEB_NOTIFICATIONS_STATUS) as Promise<{ unreadCount: number }>,
  onNotificationCountPush: (cb: (status: { unreadCount: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { unreadCount: number }) => cb(payload);
    ipcRenderer.on("app:notification-count-push", listener);
    return () => ipcRenderer.removeListener("app:notification-count-push", listener);
  },
  getAppUpdateStatus: () => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_STATUS) as Promise<AppUpdateStatus>,
  checkForAppUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_CHECK) as Promise<AppUpdateStatus>,
  downloadAppUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_DOWNLOAD) as Promise<AppUpdateStatus>,
  installAppUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_INSTALL) as Promise<{ ok: true }>,
  onAppUpdateStatusPush: (cb: (status: AppUpdateStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AppUpdateStatus) => cb(payload);
    ipcRenderer.on("app:update-status-push", listener);
    return () => ipcRenderer.removeListener("app:update-status-push", listener);
  },
  onStatusPush: (cb: (status: TrackingStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TrackingStatus) => cb(payload);
    ipcRenderer.on("tracking:status-push", listener);
    return () => ipcRenderer.removeListener("tracking:status-push", listener);
  },
  onSyncStatusPush: (cb: (status: SyncStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: SyncStatus) => cb(payload);
    ipcRenderer.on("tracking:sync-status-push", listener);
    return () => ipcRenderer.removeListener("tracking:sync-status-push", listener);
  },
  onProjectsPush: (cb: (payload: { projects: Project[]; roles: string[]; fetchedAt: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { projects: Project[]; roles: string[]; fetchedAt: string }) =>
      cb(payload);
    ipcRenderer.on("tracking:projects-push", listener);
    return () => ipcRenderer.removeListener("tracking:projects-push", listener);
  }
});
