import { BrowserWindow, screen, app } from "electron";
import fs from "node:fs";
import path from "node:path";

function positionStorePath(): string {
  return path.join(app.getPath("userData"), "time-badge-position.json");
}

function readSavedPosition(): { x: number; y: number } | null {
  try {
    const raw = fs.readFileSync(positionStorePath(), "utf8");
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // ignore
  }
  return null;
}

function savePosition(x: number, y: number): void {
  try {
    fs.writeFileSync(positionStorePath(), JSON.stringify({ x, y }), "utf8");
  } catch {
    // ignore
  }
}

function badgeHtml(): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LANDEV Time</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
      -webkit-user-select: none;
      user-select: none;
      -webkit-app-region: drag;
      cursor: grab;
    }
    .badge {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 100%;
      padding: 0 9px 0 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, #00a0e3 0%, #0087c1 100%);
      border: 1px solid #0087c1;
      box-shadow: 0 4px 14px rgba(28, 36, 48, 0.16);
      color: #fff;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
      flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.28);
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }
    .meta { min-width: 0; line-height: 1.05; }
    .label {
      font-family: "Segoe UI", "Segoe UI Variable Text", system-ui, sans-serif;
      font-size: 8px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
      font-weight: 700;
    }
    .time {
      font-family: "Cascadia Mono", "Consolas", "Segoe UI", monospace;
      font-size: 13px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.04em;
    }
  </style>
</head>
<body>
  <div class="badge" id="badge" title="Drag to move · Double-click to open tracker">
    <span class="dot"></span>
    <div class="meta">
      <div class="label">Today</div>
      <div class="time" id="time">0:00:00</div>
    </div>
  </div>
  <script>
    const timeEl = document.getElementById("time");
    let completedMs = 0;
    let startedAtMs = null;
    let frozenCompletedMs = null;
    let tickTimer = null;

    function formatElapsed(ms) {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }

    function render() {
      let live = 0;
      if (startedAtMs != null) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        live = Math.max(0, Date.now() - Math.max(startedAtMs, dayStart.getTime()));
      }
      const base = frozenCompletedMs != null ? frozenCompletedMs : completedMs;
      timeEl.textContent = formatElapsed(base + live);
    }

    function scheduleTick() {
      if (tickTimer) clearTimeout(tickTimer);
      const delay = Math.max(50, 1000 - (Date.now() % 1000));
      tickTimer = setTimeout(() => {
        render();
        if (startedAtMs != null) scheduleTick();
      }, delay);
    }

    function startTicker() {
      render();
      scheduleTick();
    }

    function stopTicker() {
      if (tickTimer) {
        clearTimeout(tickTimer);
        tickTimer = null;
      }
    }

    window.updateBadge = (payload) => {
      completedMs = Number(payload.completedMs) || 0;
      const nextStarted = payload.startedAtMs == null ? null : Number(payload.startedAtMs);
      if (payload.active && nextStarted != null) {
        if (startedAtMs !== nextStarted) {
          // Freeze completed baseline for this session so polls can't inflate the live clock.
          frozenCompletedMs = completedMs;
        }
        startedAtMs = nextStarted;
        startTicker();
      } else {
        startedAtMs = null;
        frozenCompletedMs = null;
        stopTicker();
      }
      render();
    };

    document.addEventListener("dblclick", () => {
      document.title = "landev-overlay-focus-main";
    });
  </script>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Always-on-top floating badge. Ticks locally so main-process updates
 * do not steal focus and un-minimize the tracker window on Windows.
 */
export class TimeBadgeOverlay {
  private win: BrowserWindow | null = null;
  private readonly getMainWindow: () => BrowserWindow | null;
  private lastPayloadKey = "";
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(getMainWindow: () => BrowserWindow | null) {
    this.getMainWindow = getMainWindow;
  }

  ensureVisible(): void {
    if (this.win && !this.win.isDestroyed()) {
      if (!this.win.isVisible()) this.showBadgeInactive();
      return;
    }
    this.create();
  }

  /**
   * On Windows, showing any BrowserWindow in the process can restore a
   * minimized main window. Capture minimize state and put it back if needed.
   */
  private withMainMinimizePreserved(action: () => void): void {
    const main = this.getMainWindow();
    const wasMinimized = Boolean(main && !main.isDestroyed() && main.isMinimized());
    action();
    if (!wasMinimized || !main || main.isDestroyed()) return;
    if (!main.isMinimized()) {
      main.minimize();
    }
  }

  private showBadgeInactive(): void {
    if (!this.win || this.win.isDestroyed()) return;
    this.withMainMinimizePreserved(() => {
      this.win?.showInactive();
    });
  }

  private defaultPosition(width: number, height: number): { x: number; y: number } {
    const display = screen.getPrimaryDisplay();
    const margin = 12;
    return {
      x: Math.round(display.workArea.x + display.workArea.width - width - margin),
      y: Math.round(display.workArea.y + display.workArea.height - height - margin)
    };
  }

  private create(): void {
    const width = 102;
    const height = 28;
    const saved = readSavedPosition();
    const fallback = this.defaultPosition(width, height);
    const x = saved?.x ?? fallback.x;
    const y = saved?.y ?? fallback.y;

    this.win = new BrowserWindow({
      width,
      height,
      x,
      y,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      // Critical on Windows: a focusable overlay can restore the minimized main window.
      focusable: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      ...(process.platform === "win32" ? { type: "toolbar" as const } : {}),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false
      }
    });

    this.win.setAlwaysOnTop(true, "screen-saver");
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.win.setMenuBarVisibility(false);
    this.win.setFocusable(false);

    this.win.on("moved", () => {
      if (!this.win || this.win.isDestroyed()) return;
      const [nx, ny] = this.win.getPosition();
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => savePosition(nx, ny), 250);
    });

    this.win.on("page-title-updated", (event, title) => {
      if (title === "landev-overlay-focus-main") {
        event.preventDefault();
        this.focusMain();
      }
    });

    this.win.on("closed", () => {
      this.win = null;
      this.lastPayloadKey = "";
    });

    void this.win.loadURL(badgeHtml()).then(() => {
      this.showBadgeInactive();
    });
  }

  private focusMain(): void {
    const main = this.getMainWindow();
    if (!main || main.isDestroyed()) return;
    if (main.isMinimized()) main.restore();
    if (!main.isVisible()) main.show();
    main.focus();
  }

  hide(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.hide();
    }
    this.lastPayloadKey = "";
  }

  /**
   * Sync session anchors into the badge. The badge ticks locally so we do not
   * poke its webContents every second (which un-minimizes the main window on Windows).
   */
  update(input: {
    active: boolean;
    completedMs: number;
    startedAt: string | null;
  }): void {
    if (!input.active) {
      this.hide();
      return;
    }

    const startedAtMs = input.startedAt ? Date.parse(input.startedAt) : NaN;
    const payload = {
      active: true,
      completedMs: Math.max(0, Math.round(input.completedMs)),
      startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : null
    };
    const key = `${payload.completedMs}|${payload.startedAtMs}`;
    this.ensureVisible();
    if (key === this.lastPayloadKey) return;
    this.lastPayloadKey = key;
    this.push(payload);
  }

  private push(payload: { active: boolean; completedMs: number; startedAtMs: number | null }): void {
    if (!this.win || this.win.isDestroyed()) return;
    const json = JSON.stringify(payload);
    const main = this.getMainWindow();
    const wasMinimized = Boolean(main && !main.isDestroyed() && main.isMinimized());
    void this.win.webContents
      .executeJavaScript(`window.updateBadge && window.updateBadge(${json}); true;`)
      .catch(() => undefined)
      .finally(() => {
        if (wasMinimized && main && !main.isDestroyed() && !main.isMinimized()) {
          main.minimize();
        }
      });
  }

  dispose(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.win && !this.win.isDestroyed()) {
      this.win.destroy();
    }
    this.win = null;
  }
}
