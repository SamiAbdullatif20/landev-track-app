import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

const tokenPath = path.join(app.getPath("userData"), "token.bin");
const cookiePath = path.join(app.getPath("userData"), "session-cookie.bin");

function saveEncrypted(pathname: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is unavailable for secure storage.");
  }
  const encrypted = safeStorage.encryptString(value);
  fs.writeFileSync(pathname, encrypted);
}

function readEncrypted(pathname: string): string | null {
  if (!fs.existsSync(pathname) || !safeStorage.isEncryptionAvailable()) {
    return null;
  }

  const encrypted = fs.readFileSync(pathname);
  return safeStorage.decryptString(encrypted);
}

export function saveToken(token: string): void {
  saveEncrypted(tokenPath, token);
}

export function readToken(): string | null {
  return readEncrypted(tokenPath);
}

export function clearToken(): void {
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}

export function saveSessionCookie(cookieHeader: string): void {
  saveEncrypted(cookiePath, cookieHeader);
}

export function readSessionCookie(): string | null {
  return readEncrypted(cookiePath);
}

export function clearSessionCookie(): void {
  if (fs.existsSync(cookiePath)) {
    fs.unlinkSync(cookiePath);
  }
}
