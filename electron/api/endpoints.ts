export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    logout: ["/api/auth/logout", "/auth/logout"],
    me: ["/api/auth/me", "/api/me", "/api/auth/session"]
  },
  tracking: {
    projects: "/api/projects",
    sessionStart: "/api/tracking/session/start",
    sessionStop: "/api/tracking/session/stop",
    sessionActive: "/api/tracking/session/active",
    sessionStatus: "/api/tracking/session/status",
    screenshotsSign: "/api/tracking/screenshots/sign",
    screenshotsCommit: "/api/tracking/screenshots/commit",
    eventsBatch: "/api/tracking/events/batch"
  },
  attendance: {
    today: ["/api/attendance/today", "/attendance/today"]
  }
} as const;
