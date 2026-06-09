import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const DEVICE_UUID_FILE = "device-uuid.txt";
let cachedDeviceUuid: string | null = null;

/** Stable per-install device id for tracking session stop/start payloads. */
export function getDeviceUuid(): string {
  if (cachedDeviceUuid) {
    return cachedDeviceUuid;
  }

  const filePath = path.join(app.getPath("userData"), DEVICE_UUID_FILE);
  try {
    const existing = fs.readFileSync(filePath, "utf8").trim();
    if (existing.length >= 8) {
      cachedDeviceUuid = existing;
      return existing;
    }
  } catch {
    // create on first use
  }

  const created = randomUUID();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, created, "utf8");
  cachedDeviceUuid = created;
  return created;
}
