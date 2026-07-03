import { useEffect, useState } from "react";
import { computeLiveAnchoredMs, UI_LIVE_TICK_MS } from "../utils/liveAnchoredTotal";

/**
 * Smooth 1s UI counter from a snapshot + anchor time (no per-second IPC).
 */
export function useLiveAnchoredTotal(
  anchoredTotalMs: number,
  anchorFetchedAtMs: number | null,
  enabled: boolean
): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || anchorFetchedAtMs == null) {
      return;
    }
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, UI_LIVE_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled, anchorFetchedAtMs, anchoredTotalMs]);

  return computeLiveAnchoredMs(anchoredTotalMs, anchorFetchedAtMs, enabled, nowMs);
}
