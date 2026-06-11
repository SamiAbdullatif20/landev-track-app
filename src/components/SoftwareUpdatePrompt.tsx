import { useEffect, useState } from "react";
import type { AppUpdateStatus } from "../types/app-update";

export function SoftwareUpdatePrompt() {
  const [status, setStatus] = useState<AppUpdateStatus>({ phase: "idle" });
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.desktopAPI.getAppUpdateStatus().then(setStatus).catch(() => undefined);
    const unsubscribe = window.desktopAPI.onAppUpdateStatusPush((next) => {
      setStatus(next);
      if (next.phase === "ready") {
        setDismissedVersion(null);
      }
    });
    return unsubscribe;
  }, []);

  const showAvailable =
    status.phase === "available" && status.version !== dismissedVersion;
  const showReady = status.phase === "ready";
  const showDownloading = status.phase === "downloading";

  if (!showAvailable && !showReady && !showDownloading) {
    return null;
  }

  const onDownload = async () => {
    setBusy(true);
    try {
      await window.desktopAPI.downloadAppUpdate();
    } finally {
      setBusy(false);
    }
  };

  const onInstall = () => {
    void window.desktopAPI.installAppUpdate();
  };

  const onLater = () => {
    if (status.phase === "available") {
      setDismissedVersion(status.version);
    }
    setStatus({ phase: "idle" });
  };

  return (
    <div className="update-prompt-backdrop" role="presentation">
      <section className="update-prompt-card" role="dialog" aria-labelledby="update-prompt-title">
        <h2 id="update-prompt-title" className="update-prompt-title">
          Software update needed
        </h2>

        {showAvailable && (
          <div className="update-prompt-actions">
            <button type="button" className="update-prompt-primary" disabled={busy} onClick={() => void onDownload()}>
              {busy ? "Starting download…" : "Update now"}
            </button>
            <button type="button" className="update-prompt-secondary" disabled={busy} onClick={onLater}>
              Later
            </button>
          </div>
        )}

        {showDownloading && (
          <div className="update-progress-track" aria-hidden>
            <div className="update-progress-fill" style={{ width: `${status.percent}%` }} />
          </div>
        )}

        {showReady && (
          <div className="update-prompt-actions">
            <button type="button" className="update-prompt-primary" onClick={onInstall}>
              Restart and update
            </button>
            <button type="button" className="update-prompt-secondary" onClick={onLater}>
              Later
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
