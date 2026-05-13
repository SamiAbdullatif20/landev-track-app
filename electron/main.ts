import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { registerIpc } from "./ipc/handlers";
import { logger } from "./config/logger";
import dotenv from "dotenv";
import { setupCrashAndDiagnostics } from "./services/diagnostics";
import { setupAutoUpdate } from "./services/auto-update";
import { readEnv } from "./config/env";

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
}

loadEnvFiles();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 860,
    minHeight: 640,
    title: "LANDev Track",
    icon: path.join(process.env.APP_ROOT, "build", "icons", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
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

app.whenReady().then(() => {
  readEnv();
  setupCrashAndDiagnostics();
  createWindow();
  setupAutoUpdate();
  logger.info("app-ready");
});
