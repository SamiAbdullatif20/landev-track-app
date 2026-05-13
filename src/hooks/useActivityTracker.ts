import { useEffect } from "react";

export function useActivityTracker(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let lastSentAtPerfMs = 0;
    const MIN_MS = 4000;
    const IDLE_THRESHOLD_MS = 60_000;
    const MAX_INTERVAL_MS = 300_000;
    let lastEventAtPerfMs = performance.now();
    let lastInputAtPerfMs = lastEventAtPerfMs;
    let totalSamples = 0;
    let mouseMoveSamples = 0;

    const sendActivity = (triggerType: string, isInput: boolean) => {
      const nowWallMs = Date.now();
      const nowPerfMs = performance.now();
      if (nowPerfMs - lastSentAtPerfMs < MIN_MS) return;
      lastSentAtPerfMs = nowPerfMs;
      const rawIntervalMs = nowPerfMs - lastEventAtPerfMs;
      const safeIntervalMs = Math.min(MAX_INTERVAL_MS, Math.max(0, rawIntervalMs));
      const intervalStartPerfMs = lastEventAtPerfMs;
      const intervalEndPerfMs = intervalStartPerfMs + safeIntervalMs;
      lastEventAtPerfMs = nowPerfMs;

      // Active time is only the portion before idle threshold is crossed.
      const activeCutoffPerfMs = lastInputAtPerfMs + IDLE_THRESHOLD_MS;
      const activeMs = Math.max(0, Math.min(intervalEndPerfMs, activeCutoffPerfMs) - intervalStartPerfMs);
      const idleMs = Math.max(0, safeIntervalMs - activeMs);
      if (isInput) {
        lastInputAtPerfMs = nowPerfMs;
      }
      totalSamples += 1;
      if (triggerType === "mouse_move") {
        mouseMoveSamples += 1;
      }
      const mouseMovePercent = totalSamples > 0
        ? Number(((mouseMoveSamples / totalSamples) * 100).toFixed(2))
        : 0;

      window.desktopAPI.trackEvent({
        type: "APP_FOCUS",
        occurredAt: new Date(nowWallMs).toISOString(),
        metadata: {
          source: "renderer",
          triggerType,
          activeSeconds: Number((activeMs / 1000).toFixed(3)),
          idleSeconds: Number((idleMs / 1000).toFixed(3)),
          trackerElapsedMs: safeIntervalMs,
          telemetryRawIntervalMs: Number(rawIntervalMs.toFixed(3)),
          telemetryIsIncremental: true,
          telemetryDerivedFrom: "renderer-interval",
          telemetryCapped: rawIntervalMs > MAX_INTERVAL_MS,
          totalSamples,
          mouseMoveSamples,
          mouseMovePercent
        }
      }).catch(() => {
        // kept in local queue by main process
      });
    };

    const onMouseMove = () => sendActivity("mouse_move", true);
    const onKeyDown = () => sendActivity("key_down", true);
    const onClick = () => sendActivity("click", true);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onClick);

    const heartbeat = window.setInterval(() => sendActivity("heartbeat", false), 30_000);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onClick);
      window.clearInterval(heartbeat);
    };
  }, [enabled]);
}
