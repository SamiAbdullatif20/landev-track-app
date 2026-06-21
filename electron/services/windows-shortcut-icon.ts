import { app, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../config/logger";

function resolveShortcutIconPath(): string {
  const ico = path.join(process.resourcesPath, "icon.ico");
  if (fs.existsSync(ico)) {
    return ico;
  }
  const png = path.join(process.resourcesPath, "app-icon.png");
  if (fs.existsSync(png)) {
    return png;
  }
  return process.execPath;
}

function shortcutSearchDirs(): string[] {
  const dirs = [
    app.getPath("desktop"),
    path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs")
  ];

  const programsRoot = path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs");
  for (const name of ["LANDEV Tracker", "landev-track-app"]) {
    const nested = path.join(programsRoot, name);
    if (fs.existsSync(nested)) {
      dirs.push(nested);
    }
  }

  return Array.from(new Set(dirs));
}

/** Refresh Start Menu / Desktop shortcuts so they use the bundled LD icon. */
export function refreshWindowsShortcuts(): void {
  if (process.platform !== "win32" || !app.isPackaged) {
    return;
  }

  const exePath = process.execPath;
  const iconPath = resolveShortcutIconPath();
  let refreshed = 0;

  for (const dir of shortcutSearchDirs()) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".lnk")) {
        continue;
      }

      const shortcutPath = path.join(dir, entry.name);
      try {
        const details = shell.readShortcutLink(shortcutPath);
        if (details.target.toLowerCase() !== exePath.toLowerCase()) {
          continue;
        }

        shell.writeShortcutLink(shortcutPath, {
          target: exePath,
          cwd: path.dirname(exePath),
          icon: iconPath,
          iconIndex: 0,
          description: "LANDEV Tracker"
        });
        refreshed += 1;
      } catch (error) {
        logger.warn("shortcut-refresh-skip", { shortcutPath, error });
      }
    }
  }

  if (refreshed > 0) {
    logger.info("shortcut-icon-refreshed", { count: refreshed, iconPath });
  }
}
