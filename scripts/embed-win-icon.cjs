const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

async function loadRcedit() {
  const mod = await import("rcedit");
  return mod.rcedit;
}

async function embedIcon(exePath, iconPath) {
  const rcedit = await loadRcedit();
  await rcedit(exePath, {
    icon: iconPath,
    "version-string": {
      FileDescription: "LANDEV Tracker",
      ProductName: "LANDEV Tracker",
      CompanyName: "LANDev Engineering"
    }
  });
}

function iconPathFor(root) {
  return path.join(root, "build", "icons", "icon.ico");
}

function collectCandidateExes(root) {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];

  const addIfExists = (exePath) => {
    if (exePath && fs.existsSync(exePath)) {
      candidates.push(exePath);
    }
  };

  addIfExists(path.join(root, "node_modules", "electron", "dist", "electron.exe"));

  const releaseRoot = path.join(root, "release");
  if (fs.existsSync(releaseRoot)) {
    for (const versionDir of fs.readdirSync(releaseRoot, { withFileTypes: true })) {
      if (!versionDir.isDirectory()) continue;
      addIfExists(path.join(releaseRoot, versionDir.name, "win-unpacked", "LANDEV Tracker.exe"));
    }
  }

  const installRoots = [];
  if (localAppData) {
    installRoots.push(
      path.join(localAppData, "Programs", "landev-track-app"),
      path.join(localAppData, "Programs", "LANDEV Tracker"),
      path.join(localAppData, "landev-track-app"),
      path.join(localAppData, "LANDEV Tracker")
    );
  }
  if (programFiles) {
    installRoots.push(path.join(programFiles, "LANDEV Tracker"), path.join(programFiles, "landev-track-app"));
  }
  if (programFilesX86) {
    installRoots.push(path.join(programFilesX86, "LANDEV Tracker"), path.join(programFilesX86, "landev-track-app"));
  }

  for (const installRoot of installRoots) {
    addIfExists(path.join(installRoot, "LANDEV Tracker.exe"));
  }

  return [...new Set(candidates)];
}

async function patchAll(root) {
  const icon = iconPathFor(root);
  if (!fs.existsSync(icon)) {
    throw new Error(`Missing ${icon}`);
  }

  const targets = collectCandidateExes(root);
  if (targets.length === 0) {
    console.log("[embed-win-icon] no executables found to patch");
    return [];
  }

  const patched = [];
  for (const exePath of targets) {
    try {
      console.log("[embed-win-icon] patching", exePath);
      await embedIcon(exePath, icon);
      patched.push(exePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[embed-win-icon] skip (close the app or run terminal as Administrator):", exePath);
      console.warn("[embed-win-icon]", message);
    }
  }
  return patched;
}

/** electron-builder afterPack — embed icon in packaged .exe before NSIS. */
module.exports = async function embedWinIcon(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const icon = path.join(context.packager.projectDir, "build", "icons", "icon.ico");
  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);

  if (!fs.existsSync(icon)) {
    throw new Error(`Missing Windows icon: ${icon}`);
  }
  if (!fs.existsSync(exePath)) {
    throw new Error(`Missing packaged executable: ${exePath}`);
  }

  console.log("[embed-win-icon] patching", exePath);
  await embedIcon(exePath, icon);

  const iconResource = path.join(context.appOutDir, "resources", "icon.ico");
  if (!fs.existsSync(iconResource)) {
    fs.mkdirSync(path.dirname(iconResource), { recursive: true });
    fs.copyFileSync(icon, iconResource);
    console.log("[embed-win-icon] copied icon to", iconResource);
  }

  console.log("[embed-win-icon] done");
};

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const modeAll = process.argv.includes("--all");
  const modeDev = process.argv.includes("--dev");

  const run = async () => {
    if (modeAll) {
      const patched = await patchAll(root);
      console.log(`[embed-win-icon] patched ${patched.length} executable(s)`);
      return;
    }

    if (modeDev) {
      const electronExe = path.join(root, "node_modules", "electron", "dist", "electron.exe");
      const icon = iconPathFor(root);
      if (!fs.existsSync(icon)) {
        throw new Error(`Missing ${icon}`);
      }
      if (!fs.existsSync(electronExe)) {
        throw new Error("Missing electron.exe — run npm install");
      }
      await embedIcon(electronExe, icon);
      console.log("[embed-win-icon] dev electron.exe patched");
      return;
    }

    console.error("Usage: node scripts/embed-win-icon.cjs --dev | --all");
    process.exit(1);
  };

  run().catch((error) => {
    console.error("[embed-win-icon] failed", error);
    process.exit(1);
  });
}

module.exports.patchAll = patchAll;
module.exports.embedIcon = embedIcon;
module.exports.iconPathFor = iconPathFor;
