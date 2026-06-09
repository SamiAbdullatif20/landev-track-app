import { getSetting, setSetting } from "./queue-repo";

const CURRENT_USER_KEY = "currentAppUserKey";
const ACTIVE_SESSION_OWNER_KEY = "activeSessionOwnerUserKey";

export function normalizeUserKey(username: string): string {
  return username.trim().toLowerCase();
}

export function setCurrentAppUser(username: string): void {
  const key = normalizeUserKey(username);
  if (!key) {
    return;
  }
  setSetting(CURRENT_USER_KEY, key);
}

export function getCurrentAppUserKey(): string | null {
  const raw = getSetting(CURRENT_USER_KEY);
  const key = raw?.trim();
  return key ? key : null;
}

export function clearCurrentAppUser(): void {
  setSetting(CURRENT_USER_KEY, "");
}

export function setActiveSessionOwner(username: string): void {
  const key = normalizeUserKey(username);
  if (!key) {
    return;
  }
  setSetting(ACTIVE_SESSION_OWNER_KEY, key);
}

export function setActiveSessionOwnerKey(userKey: string): void {
  const key = userKey.trim().toLowerCase();
  if (!key) {
    return;
  }
  setSetting(ACTIVE_SESSION_OWNER_KEY, key);
}

export function getActiveSessionOwnerKey(): string | null {
  const raw = getSetting(ACTIVE_SESSION_OWNER_KEY);
  const key = raw?.trim();
  return key ? key : null;
}

export function clearActiveSessionOwner(): void {
  setSetting(ACTIVE_SESSION_OWNER_KEY, "");
}

export function isActiveSessionOwnedByCurrentUser(): boolean {
  const current = getCurrentAppUserKey();
  if (!current) {
    return false;
  }
  const owner = getActiveSessionOwnerKey();
  if (!owner) {
    return false;
  }
  return owner === current;
}
