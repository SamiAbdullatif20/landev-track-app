import { useEffect, useRef, useState } from "react";
import type { AppUpdateStatus } from "../types/app-update";

const READY_INSTALL_DELAY_MS = 3_000;
const DOWNLOAD_STALL_MS = 5 * 60 * 1000;

function readTargetVersion(status: AppUpdateStatus): string | null {
  if (status.phase === "available" || status.phase === "downloading" || status.phase === "ready") {
    return status.version;
  }
  if (status.phase === "error") {
    return status.version;
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return "";
  }
  if (bytesPerSecond < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
  }
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

function estimateEtaSeconds(total: number, transferred: number, bytesPerSecond: number): number | null {
  if (!Number.isFinite(total) || !Number.isFinite(transferred) || !Number.isFinite(bytesPerSecond)) {
    return null;
  }
  if (total <= 0 || bytesPerSecond <= 0 || transferred >= total) {
    return null;
  }
  return Math.ceil((total - transferred) / bytesPerSecond);
}

function formatEta(seconds: number | null): string {
  if (seconds == null || seconds <= 0) {
    return "";
  }
  if (seconds < 60) {
    return `about ${seconds}s left`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `about ${minutes} min left`;
}

export function SoftwareUpdatePrompt() {
  const [status, setStatus] = useState<AppUpdateStatus>({ phase: "idle" });
  const [targetVersion, setTargetVersion] = useState<string | null>(null);
  const [downloadStalled, setDownloadStalled] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const lastProgressAtRef = useRef<number>(Date.now());
  const lastPercentRef = useRef<number>(0);

  const applyStatus = (next: AppUpdateStatus) => {
    setStatus(next);
    const version = readTargetVersion(next);
    if (version) {
      setTargetVersion(version);
    }
    if (next.phase === "downloading") {
      if (next.percent > lastPercentRef.current || next.transferred > 0) {
        lastPercentRef.current = next.percent;
        lastProgressAtRef.current = Date.now();
        setDownloadStalled(false);
      }
    } else {
      lastPercentRef.current = 0;
      lastProgressAtRef.current = Date.now();
      setDownloadStalled(false);
    }
    if (next.phase !== "error") {
      setRetrying(false);
    }
  };

  useEffect(() => {
    void window.desktopAPI.getAppUpdateStatus().then(applyStatus).catch(() => undefined);
    const unsubscribe = window.desktopAPI.onAppUpdateStatusPush(applyStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status.phase !== "ready") {
      return;
    }
    const timer = window.setTimeout(() => {
      void window.desktopAPI.installAppUpdate();
    }, READY_INSTALL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status.phase, targetVersion]);

  useEffect(() => {
    if (status.phase !== "downloading") {
      return;
    }
    const timer = window.setInterval(() => {
      if (Date.now() - lastProgressAtRef.current >= DOWNLOAD_STALL_MS) {
        setDownloadStalled(true);
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [status.phase]);

  const showAvailable = status.phase === "available";
  const showReady = status.phase === "ready";
  const showDownloading = status.phase === "downloading";
  const showBackgroundDownload = (showAvailable || showDownloading) && !downloadStalled;
  const showBlockingModal = showReady || downloadStalled || status.phase === "error";

  if (!showBackgroundDownload && !showBlockingModal) {
    return null;
  }

  const versionLabel = targetVersion ?? "new";
  const onInstallNow = () => {
    void window.desktopAPI.installAppUpdate();
  };
  const onRetry = () => {
    setRetrying(true);
    setDownloadStalled(false);
    lastProgressAtRef.current = Date.now();
    void window.desktopAPI.retryAppUpdate().catch(() => {
      setRetrying(false);
    });
  };

  const downloadDetail =
    status.phase === "downloading"
      ? [
          `${formatBytes(status.transferred)} / ${formatBytes(status.total)}`,
          formatSpeed(status.bytesPerSecond),
          formatEta(estimateEtaSeconds(status.total, status.transferred, status.bytesPerSecond))
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <>
      {showBackgroundDownload && (
        <div className="update-banner" role="status" aria-live="polite">
          <div className="update-banner-copy">
            <strong>Update downloading</strong>
            <span>
              Version {versionLabel}
              {showDownloading ? ` — ${Math.round(status.percent)}%` : " — starting…"}
            </span>
            {downloadDetail ? <span className="update-banner-detail">{downloadDetail}</span> : null}
          </div>
          <div className="update-banner-track" aria-hidden>
            <div
              className="update-banner-fill"
              style={{ width: `${showDownloading ? status.percent : 8}%` }}
            />
          </div>
          <p className="update-banner-hint">You can keep working while the update downloads.</p>
        </div>
      )}

      {showBlockingModal && (
        <div className="update-prompt-backdrop" role="presentation">
          <section className="update-prompt-card" role="dialog" aria-labelledby="update-prompt-title" aria-modal="true">
            <h2 id="update-prompt-title" className="update-prompt-title">
              {showReady ? "Update ready" : "Update required"}
            </h2>

            {showReady && (
              <>
                <p className="update-prompt-message">
                  Version {versionLabel} is ready. The app will restart in a few seconds to finish installing.
                </p>
                <div className="update-prompt-actions">
                  <button type="button" className="update-prompt-primary" onClick={onInstallNow}>
                    Restart now
                  </button>
                </div>
              </>
            )}

            {(downloadStalled || status.phase === "error") && (
              <>
                <p className="update-prompt-message update-prompt-error">
                  {downloadStalled
                    ? `Download of version ${versionLabel} seems stuck. Check your connection and try again.`
                    : status.phase === "error"
                      ? status.message
                      : "Update failed. Please try again."}
                </p>
                <div className="update-prompt-actions">
                  <button type="button" className="update-prompt-primary" onClick={onRetry} disabled={retrying}>
                    {retrying ? "Retrying…" : "Retry download"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
