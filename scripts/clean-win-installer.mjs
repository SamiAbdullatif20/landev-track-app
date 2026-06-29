import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const releaseDir = path.join(root, "release", version);

const staleNames = [
  `LANDEV Tracker-Windows-${version}-Setup.exe`,
  `LANDEV-Tracker-Windows-${version}-Setup.exe`,
  "__uninstaller-nsis-landev-track-app.exe",
  `landev-track-app-${version}-x64.nsis.7z`
];

if (!fs.existsSync(releaseDir)) {
  console.log(`clean-win-installer: nothing to clean (${releaseDir})`);
  process.exit(0);
}

const extraPatterns = [
  /^LANDEV-Tracker-Windows-.*-Setup\.exe$/i,
  /^LANDEV Tracker-Windows-.*-Setup\.exe$/i,
  /^__uninstaller-nsis-landev-track-app\.exe$/i,
  /^landev-track-app-.*-x64\.nsis\.7z$/i
];

let removed = 0;
const tryRemove = (target) => {
  if (!fs.existsSync(target)) {
    return;
  }
  try {
    fs.rmSync(target, { force: true });
    console.log(`removed ${target}`);
    removed += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`failed to remove ${target}: ${message}`);
    console.error("Close the installer, Explorer preview, antivirus scan, or LANDEV Tracker and retry.");
    process.exit(1);
  }
};

for (const name of staleNames) {
  tryRemove(path.join(releaseDir, name));
}

for (const entry of fs.readdirSync(releaseDir, { withFileTypes: true })) {
  if (!entry.isFile()) {
    continue;
  }
  if (extraPatterns.some((pattern) => pattern.test(entry.name))) {
    tryRemove(path.join(releaseDir, entry.name));
  }
}

console.log(`clean-win-installer: removed ${removed} file(s) from ${releaseDir}`);
