export const IPC_CHANNELS = {
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_STATUS: "auth:status",
  CONNECTION_TEST: "app:connection-test",
  APP_INFO: "app:info",
  PROJECTS_LIST: "projects:list",
  TRACKING_STATUS: "tracking:status",
  TRACKING_START: "tracking:start",
  TRACKING_STOP: "tracking:stop",
  TRACKING_SAVE_DESCRIPTION: "tracking:save-description",
  RECENT_PROJECTS: "projects:recent"
} as const;
