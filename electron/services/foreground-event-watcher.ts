import { spawn, type ChildProcess } from "node:child_process";
import readline from "node:readline";
import { logger } from "../config/logger";
import { collectActivityContext } from "./activity-metadata";
import { focusSignature } from "./tracking-app-focus";

/** Fallback poll when Win32 hook is unavailable (transition-only; no durations). */
export const FOREGROUND_FALLBACK_POLL_MS = 30_000;

const HOOK_STARTUP_MS = 5_000;

const FOREGROUND_HOOK_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Threading;
public static class LandevForegroundHook {
  private delegate void WinEventDelegate(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime);
  [DllImport("user32.dll")]
  private static extern IntPtr SetWinEventHook(uint eventMin, uint eventMax, IntPtr hmodWinEventProc, WinEventDelegate lpfnWinEventProc, uint idProcess, uint idThread, uint dwFlags);
  [DllImport("user32.dll")]
  private static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);
  [StructLayout(LayoutKind.Sequential)]
  private struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int pt_x; public int pt_y; }
  private static void OnForeground(IntPtr hWinEventHook, uint eventType, IntPtr hwnd, int idObject, int idChild, uint dwEventThread, uint dwmsEventTime) {
  Console.WriteLine("fg:" + hwnd.ToInt64());
  Console.Out.Flush();
  }
  public static void Run() {
    const uint EVENT_SYSTEM_FOREGROUND = 3;
    SetWinEventHook(EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND, IntPtr.Zero, OnForeground, 0, 0, 0);
    MSG msg;
    while (GetMessage(out msg, IntPtr.Zero, 0, 0)) { Thread.Sleep(0); }
  }
}
"@
[LandevForegroundHook]::Run()
`.trim();

export type ForegroundChangeHandler = () => void | Promise<void>;

/**
 * Win32 foreground hook when available; otherwise low-frequency signature polling.
 * Emits only on actual app/window changes — never credits durations locally.
 */
export class ForegroundEventWatcher {
  private hookProcess: ChildProcess | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private lastSignature: string | null = null;
  private running = false;
  private onChange: ForegroundChangeHandler | null = null;
  private hookActive = false;

  start(onChange: ForegroundChangeHandler): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.onChange = onChange;
    this.lastSignature = null;

    if (process.platform === "win32") {
      this.tryStartHook();
    } else {
      this.startFallbackPoller();
    }
  }

  stop(): void {
    this.running = false;
    this.onChange = null;
    this.lastSignature = null;
    this.hookActive = false;

    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.hookProcess) {
      this.hookProcess.kill();
      this.hookProcess = null;
    }
  }

  /** Compare current foreground to last signature; invoke handler only on change. */
  async detectChange(force = false): Promise<boolean> {
    const context = await collectActivityContext();
    const signature = focusSignature(context);
    if (!signature || signature === "|") {
      return false;
    }

    if (!force && signature === this.lastSignature) {
      return false;
    }

    this.lastSignature = signature;
    await this.onChange?.();
    return true;
  }

  private tryStartHook(): void {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", FOREGROUND_HOOK_SCRIPT],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
    );
    this.hookProcess = child;

    const startupTimer = setTimeout(() => {
      if (!this.hookActive && this.running) {
        logger.warn("foreground-hook-startup-timeout-using-fallback", {
          pollMs: FOREGROUND_FALLBACK_POLL_MS
        });
        this.startFallbackPoller();
      }
    }, HOOK_STARTUP_MS);

    if (!child.stdout) {
      this.startFallbackPoller();
      return;
    }

    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      if (!line.startsWith("fg:")) {
        return;
      }
      this.hookActive = true;
      clearTimeout(startupTimer);
      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
      void this.detectChange();
    });

    child.stderr.on("data", (chunk) => {
      logger.debug("foreground-hook-stderr", { chunk: String(chunk).slice(0, 200) });
    });

    child.on("exit", (code) => {
      clearTimeout(startupTimer);
      rl.close();
      this.hookProcess = null;
      if (this.running) {
        logger.warn("foreground-hook-exited-starting-fallback", { code });
        this.startFallbackPoller();
      }
    });
  }

  private startFallbackPoller(): void {
    if (this.fallbackTimer || !this.running) {
      return;
    }
    this.fallbackTimer = setInterval(() => {
      void this.detectChange();
    }, FOREGROUND_FALLBACK_POLL_MS);
    logger.info("foreground-fallback-poller-started", { pollMs: FOREGROUND_FALLBACK_POLL_MS });
  }
}
