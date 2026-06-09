import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Notification, app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../config/logger";
import { isNotificationSoundEnabled } from "./notification-settings";
import { incrementLocalNotificationUnreadCount } from "./notification-badge";

const execFileAsync = promisify(execFile);

/** Distinct bundled tones (main process — not WebView audio). */
export type NotificationSoundKind = "assignment_alert" | "session_reminder" | "sync_failure";

export type DesktopNotificationEvent =
  | "assignment_alert"
  | "session_reminder"
  | "sync_failure";

type NotifyOptions = {
  event: DesktopNotificationEvent;
  title: string;
  body: string;
};

const SOUND_FILES: Record<NotificationSoundKind, string> = {
  assignment_alert: "assignment_alert.wav",
  session_reminder: "session_reminder.wav",
  sync_failure: "sync_failure.wav"
};

let soundsPathCache: string | null = null;

function resolveSoundsDirectory(): string | null {
  if (soundsPathCache && fs.existsSync(soundsPathCache)) {
    return soundsPathCache;
  }

  const candidates = [
    path.join(process.resourcesPath, "sounds"),
    path.join(app.getAppPath(), "build", "sounds"),
    path.join(process.env.APP_ROOT ?? "", "build", "sounds")
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      soundsPathCache = candidate;
      return candidate;
    }
  }
  return null;
}

function resolveSoundPath(kind: NotificationSoundKind): string | null {
  const dir = resolveSoundsDirectory();
  if (!dir) {
    return null;
  }
  const filePath = path.join(dir, SOUND_FILES[kind]);
  return fs.existsSync(filePath) ? filePath : null;
}

/**
 * Windows: Media.SoundPlayer in PowerShell (in-app WAV, not renderer).
 * Falls back to console beep if WAV missing.
 */
async function playBundledSound(kind: NotificationSoundKind): Promise<void> {
  const filePath = resolveSoundPath(kind);
  if (!filePath) {
    logger.warn("notification-sound-missing", { kind });
    return;
  }

  if (process.platform === "win32") {
    const escaped = filePath.replace(/'/g, "''");
    const script = `(New-Object System.Media.SoundPlayer '${escaped}').Play()`;
    try {
      await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
        { windowsHide: true, timeout: 5000 }
      );
      logger.info("notification-sound-played", { kind, api: "System.Media.SoundPlayer", filePath });
      return;
    } catch (error) {
      logger.warn("notification-sound-play-failed", { kind, error });
    }
  }

  logger.info("notification-sound-skipped-non-windows", { kind, platform: process.platform });
}

/**
 * Electron Notification API (Windows toast when AUMID is set in main).
 * `silent: true` disables the OS toast chime; we play bundled WAV separately when enabled.
 */
function showWindowsToast(options: NotifyOptions, playSound: boolean): void {
  if (!Notification.isSupported()) {
    logger.warn("notification-toast-unsupported", { event: options.event });
    return;
  }

  const notification = new Notification({
    title: options.title,
    body: options.body,
    silent: !playSound
  });
  notification.show();
  logger.info("notification-toast-shown", {
    event: options.event,
    api: "electron.Notification",
    silent: !playSound,
    aumid: "com.landev.track"
  });
}

/**
 * Fire desktop notification: optional toast + bundled in-app sound.
 * Web dashboard sounds are separate (browser) — not handled here.
 */
export async function notifyDesktop(options: NotifyOptions): Promise<void> {
  const soundEnabled = isNotificationSoundEnabled();
  const soundKind: NotificationSoundKind = options.event;

  incrementLocalNotificationUnreadCount(options.event);

  logger.info("notification-trigger", {
    event: options.event,
    soundEnabled,
    soundKind,
    title: options.title
  });

  showWindowsToast(options, soundEnabled);

  if (soundEnabled) {
    await playBundledSound(soundKind);
  }
}
