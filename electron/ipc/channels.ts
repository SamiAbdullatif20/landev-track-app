export const IPC_CHANNELS = {
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_STATUS: "auth:status",
  CONNECTION_TEST: "app:connection-test",
  APP_INFO: "app:info",
  SESSION_START: "tracking:start",
  SESSION_STOP: "tracking:stop",
  TRACKING_EVENT: "tracking:event",
  SESSION_STATUS: "tracking:status",
  TRACKING_PROJECTS: "tracking:projects",
  TRACKING_SYNC_STATUS: "tracking:sync-status",
  SYNC_NOW: "tracking:sync"
} as const;
