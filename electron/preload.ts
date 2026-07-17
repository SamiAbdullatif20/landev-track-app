import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./ipc/channels";

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

contextBridge.exposeInMainWorld("desktopAPI", {
  login: (payload: { username: string; password: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, payload) as Promise<{
      ok: true;
      profile: UserProfile;
      tracking: TrackingStatus;
    }>,
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT) as Promise<{ ok: true }>,
  authStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_STATUS) as Promise<{
      authenticated: boolean;
      profile: UserProfile | null;
      tracking: TrackingStatus;
    }>,
  testConnection: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_TEST) as Promise<{
      reachable: boolean;
      message: string;
    }>,
  getAppInfo: () =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_INFO) as Promise<{
      appName: string;
      appVersion: string;
      env: string;
      apiBaseUrl: string;
    }>,
  getProjects: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_LIST) as Promise<{ projects: Project[] }>,
  getTrackingStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRACKING_STATUS) as Promise<TrackingStatus>,
  startTracking: (payload: { projectId: string; projectName: string; description: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRACKING_START, payload) as Promise<TrackingStatus>,
  stopTracking: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TRACKING_STOP) as Promise<TrackingStatus>,
  saveDescription: (description: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TRACKING_SAVE_DESCRIPTION, { description }) as Promise<{
      ok: true;
    }>,
  getRecentProjects: () =>
    ipcRenderer.invoke(IPC_CHANNELS.RECENT_PROJECTS) as Promise<{
      projects: Array<{ projectId: string; projectName: string; lastWorkedAt: string }>;
    }>,
  onTrackingStatus: (cb: (status: TrackingStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TrackingStatus) => cb(payload);
    ipcRenderer.on("tracking:status", listener);
    return () => ipcRenderer.removeListener("tracking:status", listener);
  }
});
