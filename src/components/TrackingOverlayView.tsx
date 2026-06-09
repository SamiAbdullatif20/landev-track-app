import { useEffect, useState } from "react";
import { formatClockDuration } from "../utils/formatElapsed";
import "../overlay.css";

export function TrackingOverlayView() {
  const [active, setActive] = useState(false);
  const [todayTotalMs, setTodayTotalMs] = useState(0);

  useEffect(() => {
    const applyStatus = (status: { active: boolean }) => {
      setActive(status.active);
    };

    window.desktopAPI.getStatus().then(applyStatus).catch(() => undefined);
    const unsubscribe = window.desktopAPI.onStatusPush(applyStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!active) {
      setTodayTotalMs(0);
      return;
    }

    const refreshTodayTotal = () => {
      window.desktopAPI
        .getWorkSummary()
        .then((summary) => setTodayTotalMs(summary.todayTotalMs))
        .catch(() => undefined);
    };

    refreshTodayTotal();
    const intervalId = window.setInterval(refreshTodayTotal, 1000);
    return () => window.clearInterval(intervalId);
  }, [active]);

  if (!active) {
    return null;
  }

  const todayLabel = formatClockDuration(todayTotalMs);

  return (
    <div className="tracking-overlay-shell">
      <div
        className="tracking-overlay-pill"
        title={`Worked today: ${todayLabel}`}
      >
        <span className="tracking-overlay-dot" aria-hidden />
        <span className="tracking-overlay-label">Today</span>
        <span className="tracking-overlay-timer">{todayLabel}</span>
      </div>
    </div>
  );
}
