import "./overlay.css";
import { computeLiveAnchoredMs, UI_LIVE_TICK_MS } from "./utils/liveAnchoredTotal";

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

let tickHandle: number | null = null;
let anchorTodayMs = 0;
let anchorFetchedAtMs: number | null = null;
let overlayActive = false;

function stopLiveTick(): void {
  if (tickHandle != null) {
    window.clearInterval(tickHandle);
    tickHandle = null;
  }
}

function liveTodayMs(): number {
  return computeLiveAnchoredMs(anchorTodayMs, anchorFetchedAtMs, overlayActive);
}

function paintLiveToday(): void {
  render(overlayActive, liveTodayMs());
}

function startLiveTick(): void {
  stopLiveTick();
  tickHandle = window.setInterval(() => {
    paintLiveToday();
  }, UI_LIVE_TICK_MS);
}

async function refreshAnchor(): Promise<void> {
  const summary = await window.desktopAPI.getWorkSummary();
  anchorTodayMs = summary.todayTotalMs;
  anchorFetchedAtMs = Date.now();
  paintLiveToday();
}

function applyStatus(status: { active: boolean }): void {
  overlayActive = status.active;
  if (!status.active) {
    stopLiveTick();
    anchorTodayMs = 0;
    anchorFetchedAtMs = null;
    render(false, 0);
    return;
  }
  void refreshAnchor().then(() => {
    startLiveTick();
  });
}

window.desktopAPI.getStatus().then(applyStatus).catch(() => undefined);
window.desktopAPI.onStatusPush((status) => {
  applyStatus(status);
  if (status.active) {
    void refreshAnchor();
  }
});
