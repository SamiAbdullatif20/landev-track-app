import type { BrowserWindow } from "electron";
import { getSetting, setSetting } from "../db/queue-repo";
import { logger } from "../config/logger";

const LOCAL_UNREAD_KEY = "localNotificationUnreadCount";

let mainWindow: BrowserWindow | null = null;
let lastRemoteUnread = 0;

export function setLastRemoteNotificationUnreadCount(remoteUnread: number): void {
  lastRemoteUnread = Math.max(0, Math.floor(remoteUnread));
}

export function registerNotificationBadgeWindow(window: BrowserWindow): void {
  mainWindow = window;
}

export function clearNotificationBadgeWindow(): void {
  mainWindow = null;
}

export function getLocalNotificationUnreadCount(): number {
  const raw = getSetting(LOCAL_UNREAD_KEY);
  const parsed = Number(raw ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

export function incrementLocalNotificationUnreadCount(reason: string): number {
  const next = getLocalNotificationUnreadCount() + 1;
  setSetting(LOCAL_UNREAD_KEY, String(next));
  const merged = mergeNotificationUnreadCount(lastRemoteUnread);
  logger.info("notification-badge-local-increment", { reason, localUnread: next, mergedUnread: merged });
  publishNotificationCount(merged);
  return next;
}

export function clearLocalNotificationUnreadCount(): void {
  setSetting(LOCAL_UNREAD_KEY, "0");
  publishNotificationCount(mergeNotificationUnreadCount(lastRemoteUnread));
}

export function publishNotificationCount(unreadCount: number): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("app:notification-count-push", {
    unreadCount: Math.max(0, unreadCount)
  });
}

export function mergeNotificationUnreadCount(remoteUnread: number): number {
  const local = getLocalNotificationUnreadCount();
  const remote = Math.max(0, Math.floor(remoteUnread));
  return local + remote;
}

export function getMergedNotificationUnreadCount(): number {
  return mergeNotificationUnreadCount(lastRemoteUnread);
}
