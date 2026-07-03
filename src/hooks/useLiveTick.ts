import { useEffect, useState } from "react";
import { UI_LIVE_TICK_MS } from "../utils/liveAnchoredTotal";

/** Drives once-per-second UI updates without IPC (renderer only). */
export function useLiveTick(enabled: boolean): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, UI_LIVE_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled]);

  return nowMs;
}
