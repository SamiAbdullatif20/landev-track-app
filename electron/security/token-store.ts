import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

const tokenPath = path.join(app.getPath("userData"), "token.bin");

export function saveToken(token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is unavailable for token storage.");
  }
  const encrypted = safeStorage.encryptString(token);
  fs.writeFileSync(tokenPath, encrypted);
}

export function readToken(): string | null {
  if (!fs.existsSync(tokenPath) || !safeStorage.isEncryptionAvailable()) {
    return null;
  }

  const encrypted = fs.readFileSync(tokenPath);
  return safeStorage.decryptString(encrypted);
}

export function clearToken(): void {
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}
