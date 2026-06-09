import { app, BrowserWindow, desktopCapturer, session } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { registerIpc, stopActiveSessionIfRunning } from "./ipc/handlers";
import { logger } from "./config/logger";
import dotenv from "dotenv";
import { setupCrashAndDiagnostics } from "./services/diagnostics";
import { setupAutoUpdate } from "./services/auto-update";
import { readEnv } from "./config/env";
import { applyPackagedEnvDefaults } from "./config/packaged-defaults";

function loadEnvFiles(): void {
  const envProfile = process.env.VITE_APP_ENV ?? (app.isPackaged ? "prod" : "development");
  const profileFile = `.env.${envProfile}`;
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.resourcesPath, ".env"),
    path.join(app.getAppPath(), ".env"),
    path.join(process.cwd(), profileFile),
    path.join(process.resourcesPath, profileFile),
    path.join(app.getAppPath(), profileFile),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath, override: true });
  }
  applyPackagedEnvDefaults();
}

loadEnvFiles();

/** Windows toast AUMID — required for Notification sounds/toasts on Windows 10/11. */
const WINDOWS_APP_USER_MODEL_ID = "com.landev.track";
if (process.platform === "win32") {
  app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

let win: BrowserWindow | null;

function focusMainWindow(): void {
  if (!win || win.isDestroyed()) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  if (!win.isVisible()) {
    win.show();
  }
  win.focus();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  logger.warn("second-instance-quit", { pid: process.pid });
  app.quit();
} else {
  app.on("second-instance", () => {
    logger.info("second-instance-blocked-focusing-existing", { pid: process.pid });
    focusMainWindow();
  });
}

function setupDisplayMediaHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer
      .getSources({ types: ["screen"], thumbnailSize: { width: 1920, height: 1080 } })
      .then((sources) => {
        const screen = sources.find((source) => source.id.toLowerCase().startsWith("screen")) ?? sources[0];
        if (screen) {
          callback({ video: screen, audio: "loopback" });
          return;
        }
        callback({});
      })
      .catch((error) => {
        logger.warn("display-media-handler-failed", { error });
        callback({});
      });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 720,
    minWidth: 360,
    minHeight: 560,
    title: "LANDEV Tracker",
    icon: path.join(process.env.APP_ROOT, "public", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      devTools: !app.isPackaged
    }
  });

  registerIpc(win);

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

let isQuitting = false;
app.on("before-quit", (event) => {
  if (isQuitting) {
    return;
  }
  event.preventDefault();
  isQuitting = true;
  void stopActiveSessionIfRunning()
    .catch((error) => {
      logger.warn("stop-on-app-quit-failed", { error });
    })
    .finally(() => {
      app.exit(0);
    });
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) {
    return;
  }
  readEnv();
  setupCrashAndDiagnostics();
  setupDisplayMediaHandler();
  createWindow();
  if (win) {
    setupAutoUpdate(win);
  }
  logger.info("app-ready");
});
