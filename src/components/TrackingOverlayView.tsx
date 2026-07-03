import { useEffect, useMemo, useState } from "react";
import { formatClockDuration } from "../utils/formatElapsed";
import { computeLiveAnchoredMs } from "../utils/liveAnchoredTotal";
import { useLiveTick } from "../hooks/useLiveTick";
import "../overlay.css";

export function TrackingOverlayView() {
  const [active, setActive] = useState(false);
  const [todayTotalMs, setTodayTotalMs] = useState(0);
  const [summaryFetchedAtMs, setSummaryFetchedAtMs] = useState<number | null>(null);
  const liveTickMs = useLiveTick(active);

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
      setSummaryFetchedAtMs(null);
      return;
    }

    const refreshTodayTotal = () => {
      window.desktopAPI
        .getWorkSummary()
        .then((summary) => {
          setTodayTotalMs(summary.todayTotalMs);
          setSummaryFetchedAtMs(Date.now());
        })
        .catch(() => undefined);
    };

    refreshTodayTotal();
    const unsubscribe = window.desktopAPI.onStatusPush(() => {
      refreshTodayTotal();
    });
    return unsubscribe;
  }, [active]);

  const liveTodayTotalMs = useMemo(
    () => computeLiveAnchoredMs(todayTotalMs, summaryFetchedAtMs, active, liveTickMs),
    [todayTotalMs, summaryFetchedAtMs, active, liveTickMs]
  );

  if (!active) {
    return null;
  }

  const todayLabel = formatClockDuration(liveTodayTotalMs);

  return (
    <div className="tracking-overlay-shell">
      <div
        className="tracking-overlay-pill"
        title={`Worked today: ${todayLabel}`}
      >
        <span className="tracking-overlay-dot" aria-hidden="true" />
        <span className="tracking-overlay-label">Today</span>
        <span className="tracking-overlay-timer">{todayLabel}</span>
      </div>
    </div>
  );
}
