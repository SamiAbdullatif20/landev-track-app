import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../config/logger";

const execFileAsync = promisify(execFile);

const SPI_GETBEEP = 1;
const SPI_SETBEEP = 2;

const WIN_BEEP_TYPES = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinBeep {
  [DllImport("user32.dll", SetLastError = true, EntryPoint = "SystemParametersInfo")]
  public static extern bool GetBeep(uint action, uint param, ref int value, uint flags);
  [DllImport("user32.dll", SetLastError = true, EntryPoint = "SystemParametersInfo")]
  public static extern bool SetBeep(uint action, uint param, IntPtr zero, uint flags);
}
"@
`.trim();

let guardDepth = 0;
let savedBeepEnabled: boolean | null = null;

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, timeout: 8000 }
  );
  return stdout.trim();
}

async function disableWindowsCaptureSounds(): Promise<void> {
  if (process.platform !== "win32") {
    return;
  }

  guardDepth += 1;
  if (guardDepth > 1) {
    return;
  }

  try {
    const prev = await runPowerShell(`${WIN_BEEP_TYPES}
$enabled = 0
[void][WinBeep]::GetBeep(${SPI_GETBEEP}, 0, [ref]$enabled, 0)
[void][WinBeep]::SetBeep(${SPI_SETBEEP}, 0, [IntPtr]::Zero, 0)
Write-Output $enabled`);
    savedBeepEnabled = prev === "1";
  } catch (error) {
    savedBeepEnabled = null;
    logger.warn("screenshot-sound-guard-disable-failed", { error });
  }
}

async function restoreWindowsCaptureSounds(): Promise<void> {
  if (process.platform !== "win32") {
    return;
  }

  if (guardDepth <= 0) {
    return;
  }

  guardDepth -= 1;
  if (guardDepth > 0 || savedBeepEnabled === null) {
    return;
  }

  try {
    const restoreFlag = savedBeepEnabled ? 1 : 0;
    await runPowerShell(`${WIN_BEEP_TYPES}
[void][WinBeep]::SetBeep(${SPI_SETBEEP}, ${restoreFlag}, [IntPtr]::Zero, 0)`);
  } catch (error) {
    logger.warn("screenshot-sound-guard-restore-failed", { error });
  } finally {
    savedBeepEnabled = null;
  }
}

/** Suppress Windows capture beeps while taking a screenshot. */
export async function withSilentWindowsCapture<T>(fn: () => Promise<T>): Promise<T> {
  await disableWindowsCaptureSounds();
  try {
    return await fn();
  } finally {
    await restoreWindowsCaptureSounds();
  }
}

/** @internal Test helper */
export function resetSilentCaptureGuardForTests(): void {
  guardDepth = 0;
  savedBeepEnabled = null;
}
