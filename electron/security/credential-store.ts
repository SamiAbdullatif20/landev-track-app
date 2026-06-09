import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

const credentialsPath = path.join(app.getPath("userData"), "login-credentials.bin");

export type SavedCredentials = {
  username: string;
  password: string;
};

function saveEncrypted(value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS encryption is unavailable for secure storage.");
  }
  fs.writeFileSync(credentialsPath, safeStorage.encryptString(value));
}

function readEncrypted(): string | null {
  if (!fs.existsSync(credentialsPath) || !safeStorage.isEncryptionAvailable()) {
    return null;
  }
  return safeStorage.decryptString(fs.readFileSync(credentialsPath));
}

export function saveCredentials(username: string, password: string): void {
  saveEncrypted(JSON.stringify({ username, password }));
}

export function readCredentials(): SavedCredentials | null {
  const raw = readEncrypted();
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SavedCredentials;
    if (!parsed.username || !parsed.password) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  if (fs.existsSync(credentialsPath)) {
    fs.unlinkSync(credentialsPath);
  }
}
