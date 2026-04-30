export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    me: ["/api/auth/me", "/auth/me", "/api/auth/session", "/auth/session"],
    logout: ["/api/auth/logout", "/auth/logout"]
  },
  tracking: {
    projects: ["/api/tracking/projects", "/tracking/projects"],
    eventsIngest: ["/api/tracking/events/ingest", "/tracking/events/ingest"],
    sessionStop: ["/api/tracking/session/stop", "/tracking/session/stop", "/api/tracking/sessions/stop", "/tracking/sessions/stop"]
  },
  attendance: {
    today: ["/api/attendance/today", "/attendance/today"]
  }
} as const;
