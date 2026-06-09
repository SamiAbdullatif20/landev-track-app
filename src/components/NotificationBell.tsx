import { useCallback, useEffect, useState } from "react";

const POLL_MS = 30_000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const status = await window.desktopAPI.getWebNotificationsStatus();
      setUnreadCount(Math.max(0, status.unreadCount));
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = window.desktopAPI.onNotificationCountPush((status) => {
      setUnreadCount(Math.max(0, status.unreadCount));
    });
    const intervalId = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const label =
    unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      : "No unread notifications";

  return (
    <div
      className={`notification-bell-indicator ${unreadCount > 0 ? "has-unread" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
      title={label}
    >
      <svg className="notification-bell-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a5 5 0 0 0-5 5v2.1c0 .5-.2 1-.5 1.4L4.4 13.2A2 2 0 0 0 6 17h12a2 2 0 0 0 1.6-3.8l-2.1-2.7c-.3-.4-.5-.9-.5-1.4V7a5 5 0 0 0-5-5Z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="notification-badge" aria-hidden="true">
          {badgeLabel}
        </span>
      )}
    </div>
  );
}
