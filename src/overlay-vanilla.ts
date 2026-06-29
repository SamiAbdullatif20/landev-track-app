import "./overlay.css";

const OVERLAY_POLL_MS = 5000;

function formatClockDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

function render(active: boolean, todayTotalMs: number): void {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }
  if (!active) {
    root.innerHTML = "";
    return;
  }
  const todayLabel = formatClockDuration(todayTotalMs);
  root.innerHTML = `
    <div class="tracking-overlay-shell">
      <div class="tracking-overlay-pill" title="Worked today: ${todayLabel}">
        <span class="tracking-overlay-dot" aria-hidden="true"></span>
        <span class="tracking-overlay-label">Today</span>
        <span class="tracking-overlay-timer">${todayLabel}</span>
      </div>
    </div>
  `;
}

let pollHandle: number | null = null;

function stopPolling(): void {
  if (pollHandle != null) {
    window.clearInterval(pollHandle);
    pollHandle = null;
  }
}

function startPolling(): void {
  stopPolling();
  const refreshTodayTotal = () => {
    window.desktopAPI
      .getWorkSummary()
      .then((summary) => {
        render(true, summary.todayTotalMs);
      })
      .catch(() => undefined);
  };
  refreshTodayTotal();
  pollHandle = window.setInterval(refreshTodayTotal, OVERLAY_POLL_MS);
}

function applyStatus(status: { active: boolean }): void {
  if (!status.active) {
    stopPolling();
    render(false, 0);
    return;
  }
  render(true, 0);
  startPolling();
}

window.desktopAPI.getStatus().then(applyStatus).catch(() => undefined);
window.desktopAPI.onStatusPush(applyStatus);
