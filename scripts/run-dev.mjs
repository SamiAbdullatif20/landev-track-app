import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);

async function loadEmbedIcon() {
  return require("./embed-win-icon.cjs");
}

function electronVersion() {
  return require(path.join(root, "node_modules", "electron", "package.json")).version;
}

async function prepareBrandedDevElectron() {
  if (process.platform !== "win32") {
    return null;
  }

  const { embedIcon, iconPathFor } = await loadEmbedIcon();
  const srcDist = path.join(root, "node_modules", "electron", "dist");
  const devDist = path.join(root, "build", "dev-electron");
  const markerFile = path.join(devDist, ".electron-version");
  const version = electronVersion();
  const icon = iconPathFor(root);

  if (!fs.existsSync(icon)) {
    throw new Error(`Missing ${icon}. Run: node scripts/generate-app-icon.mjs <source.png>`);
  }
  if (!fs.existsSync(srcDist)) {
    throw new Error("Missing electron dist. Run: npm install");
  }

  const needsCopy =
    !fs.existsSync(path.join(devDist, "electron.exe"))
    || !fs.existsSync(markerFile)
    || fs.readFileSync(markerFile, "utf8").trim() !== version;

  if (needsCopy) {
    fs.rmSync(devDist, { recursive: true, force: true });
    fs.cpSync(srcDist, devDist, { recursive: true });
    fs.writeFileSync(markerFile, version, "utf8");
  }

  const stockExe = path.join(devDist, "electron.exe");
  const brandedExe = path.join(devDist, "LANDEV Tracker Dev.exe");
  if (!fs.existsSync(brandedExe) || needsCopy) {
    fs.copyFileSync(stockExe, brandedExe);
  }

  await embedIcon(stockExe, icon);
  await embedIcon(brandedExe, icon);
  console.log("[dev-electron] using branded runtime:", brandedExe);
  return brandedExe;
}

await prepareBrandedDevElectron();

const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin], {
  cwd: root,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
