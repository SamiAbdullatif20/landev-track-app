import { getSetting, setSetting } from "../db/queue-repo";

export const NOTIFICATION_SOUND_ENABLED_KEY = "notificationSoundEnabled";

export function isNotificationSoundEnabled(): boolean {
  const raw = getSetting(NOTIFICATION_SOUND_ENABLED_KEY);
  if (raw == null || raw === "") {
    return true;
  }
  return raw === "true";
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  setSetting(NOTIFICATION_SOUND_ENABLED_KEY, enabled ? "true" : "false");
}
