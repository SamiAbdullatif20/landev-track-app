import { useEffect, useState } from "react";
import { formatElapsed } from "../utils/formatElapsed";

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
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [active, startedAt]);

  return label;
}
