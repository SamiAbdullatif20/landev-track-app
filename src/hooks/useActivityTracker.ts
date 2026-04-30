import { useEffect } from "react";

export function useActivityTracker(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let lastSent = 0;
    const MIN_MS = 4000;

    const sendActivity = (type: string) => {
      const now = Date.now();
      if (now - lastSent < MIN_MS) return;
      lastSent = now;

      window.desktopAPI.trackEvent({
        type,
        occurredAt: new Date(now).toISOString(),
        metadata: { source: "renderer" }
      }).catch(() => {
        // kept in local queue by main process
      });
    };

    const onMouseMove = () => sendActivity("mouse_move");
    const onKeyDown = () => sendActivity("key_down");
    const onClick = () => sendActivity("click");

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onClick);

    const heartbeat = window.setInterval(() => sendActivity("heartbeat"), 30_000);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onClick);
      window.clearInterval(heartbeat);
    };
  }, [enabled]);
}
