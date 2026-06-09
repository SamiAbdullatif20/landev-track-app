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
    sessionStop: "/api/tracking/session/stop"
  },
  attendance: {
    today: ["/api/attendance/today", "/attendance/today"]
  },
  notifications: {
    unreadCount: [
      ...(process.env.VITE_NOTIFICATIONS_UNREAD_PATH
        ? [process.env.VITE_NOTIFICATIONS_UNREAD_PATH.trim()]
        : []),
      "/api/notifications/unread-count",
      "/api/notifications/unread",
      "/api/notifications/count",
      "/api/notifications"
    ],
    markSeen: [
      "/api/notifications/mark-all-read",
      "/api/notifications/read-all",
      "/api/notifications/mark-seen"
    ]
  }
} as const;
