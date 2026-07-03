export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    logout: ["/api/auth/logout", "/auth/logout"],
    me: ["/api/auth/me", "/api/me", "/api/auth/session"]
  },
  tracking: {
    projects: ["/api/projects", "/projects", "/api/tracking/projects", "/tracking/projects"],
    eventsIngest: ["/api/tracking/events/ingest", "/tracking/events/ingest"],
    eventsBatch: "/api/tracking/events/batch",
    screenshotsIngest: ["/api/tracking/screenshots/ingest", "/tracking/screenshots/ingest"],
    sessionStart: "/api/tracking/session/start",
    sessionStop: "/api/tracking/session/stop",
    sessionActive: "/api/tracking/session/active",
    sessionStatus: "/api/tracking/session/status"
  },
  attendance: {
    today: ["/api/attendance/today", "/attendance/today"]
  }
} as const;
