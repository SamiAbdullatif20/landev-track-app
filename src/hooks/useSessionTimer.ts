import { useEffect, useState } from "react";
import { formatElapsed } from "../utils/formatElapsed";
import { UI_LIVE_TICK_MS } from "../utils/liveAnchoredTotal";

/** Session elapsed label — computed in renderer only (not synced to backend). */
export function useSessionTimer(active: boolean, startedAt: string | null): string {
  const [label, setLabel] = useState("0:00");

  useEffect(() => {
    if (!active || !startedAt) {
      setLabel("0:00");
      return;
    }

    const startedMs = Date.parse(startedAt);
    if (!Number.isFinite(startedMs)) {
      setLabel("0:00");
      return;
    }

    const tick = () => {
      setLabel(formatElapsed(Date.now() - startedMs));
    };

    tick();
    const intervalId = window.setInterval(tick, UI_LIVE_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [active, startedAt]);

  return label;
}
