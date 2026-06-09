import { BrowserWindow, screen } from "electron";
import { getSessionState } from "../db/queue-repo";

type TrackingOverlayOptions = {
  preloadPath: string;
  overlayUrl: string;
};

const OVERLAY_WIDTH = 132;
const OVERLAY_HEIGHT = 32;
const SCREEN_MARGIN = 10;

export class TrackingOverlayManager {
  private overlayWindow: BrowserWindow | null = null;
  private overlayPositioned = false;

  constructor(private readonly options: TrackingOverlayOptions) {}

  syncVisibility(): void {
    if (Boolean(getSessionState().active)) {
      this.show();
      return;
    }
    this.hide();
  }

  hide(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      return;
    }
    if (this.overlayWindow.isVisible()) {
      this.overlayWindow.hide();
    }
  }

  destroy(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.destroy();
    }
    this.overlayWindow = null;
    this.overlayPositioned = false;
  }

  private show(): void {
    const overlay = this.ensureWindow();
    if (!overlay || overlay.isDestroyed()) {
      return;
    }

    if (!this.overlayPositioned) {
      this.positionOverlay(overlay);
      this.overlayPositioned = true;
    }

    if (overlay.isVisible()) {
      return;
    }

    overlay.showInactive();
  }

  private positionOverlay(overlay: BrowserWindow): void {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const { workArea } = display;
    const x = workArea.x + workArea.width - OVERLAY_WIDTH - SCREEN_MARGIN;
    const y = workArea.y + workArea.height - OVERLAY_HEIGHT - SCREEN_MARGIN;
    overlay.setBounds({ x, y, width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT });
  }

  private ensureWindow(): BrowserWindow {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      return this.overlayWindow;
    }

    this.overlayWindow = new BrowserWindow({
      width: OVERLAY_WIDTH,
      height: OVERLAY_HEIGHT,
      frame: false,
      resizable: false,
      movable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      focusable: false,
      hasShadow: false,
      thickFrame: false,
      webPreferences: {
        preload: this.options.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    this.overlayWindow.setAlwaysOnTop(true, "screen-saver");
    void this.overlayWindow.loadURL(this.options.overlayUrl);
    return this.overlayWindow;
  }
}
