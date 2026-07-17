import { app, BrowserWindow, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { registerIpc } from "./ipc/handlers";
import { logger } from "./config/logger";
import { readEnv } from "./config/env";
import { applyPackagedEnvDefaults } from "./config/packaged-defaults";
import { setupCrashAndDiagnostics } from "./services/diagnostics";
import { startAutoUpdater } from "./services/auto-update";

function loadEnvFiles(): void {
  const envProfile = process.env.VITE_APP_ENV ?? (app.isPackaged ? "prod" : "development");
  const profileFile = `.env.${envProfile}`;
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.resourcesPath, ".env"),
    path.join(app.getAppPath(), ".env"),
    path.join(process.cwd(), profileFile),
    path.join(process.resourcesPath, profileFile),
    path.join(app.getAppPath(), profileFile)
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath, override: true });
  }
  applyPackagedEnvDefaults();
}

loadEnvFiles();

if (process.platform === "win32") {
  app.setAppUserModelId(app.isPackaged ? "com.landev.track" : "com.landev.track.dev");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function focusMainWindow(): void {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => focusMainWindow());
}

function loadAppIcon() {
  const candidates = [
    path.join(process.env.APP_ROOT ?? "", "build", "icons", "icon.ico"),
    path.join(process.env.VITE_PUBLIC ?? "", "app-icon.png")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const image = nativeImage.createFromPath(candidate);
      if (!image.isEmpty()) return image;
    }
  }
  return undefined;
}

function createWindow() {
  const icon = loadAppIcon();
  win = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 380,
    minHeight: 600,
    title: "LANDEV Tracker",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
      devTools: !app.isPackaged,
      spellcheck: false,
      enableWebSQL: false
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
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;
  readEnv();
  setupCrashAndDiagnostics();
  createWindow();
  startAutoUpdater(() => win);
  logger.info("app-ready-tracker-v2", { apiBaseUrl: readEnv().VITE_API_BASE_URL });
});
