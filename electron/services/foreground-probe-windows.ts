import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { logger } from "../config/logger";
import type { ActivityContext } from "./activity-metadata";

const SAMPLE_TIMEOUT_MS = 4000;

const windowsForegroundBootstrap = [
  "Add-Type @\"",
  "using System; using System.Diagnostics; using System.Runtime.InteropServices; using System.Text;",
  "public class LandevForegroundProbe {",
  "  [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();",
  "  [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);",
  "  [DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);",
  "  public static object Sample() {",
  "    var hwnd = GetForegroundWindow();",
  "    if (hwnd == IntPtr.Zero) { return new { hasForegroundWindowHandle = false, windowReasonCode = \"null_hwnd\" }; }",
  "    uint procId = 0;",
  "    GetWindowThreadProcessId(hwnd, out procId);",
  "    var sb = new StringBuilder(2048);",
  "    int titleLen = GetWindowText(hwnd, sb, sb.Capacity);",
  "    string winTitle = titleLen > 0 ? sb.ToString() : \"\";",
  "    string reason = titleLen == 0 ? \"empty_title\" : null;",
  "    string processName = null;",
  "    string executablePath = null;",
  "    try {",
  "      var proc = Process.GetProcessById((int)procId);",
  "      processName = proc.ProcessName;",
  "      try { if (proc.MainModule != null) { executablePath = proc.MainModule.FileName; } } catch { }",
  "    } catch { if (reason == null) { reason = \"process_not_found\"; } }",
  "    return new { hasForegroundWindowHandle = true, windowReasonCode = reason, processId = (int)procId, appName = processName, processName, executablePath, activeWindowTitle = winTitle };",
  "  }",
  "}",
  "\"@",
  "while ($true) {",
  "  $line = [Console]::In.ReadLine()",
  "  if ($line -eq 'exit') { break }",
  "  if ($line -eq 'sample') {",
  "    try { [LandevForegroundProbe]::Sample() | ConvertTo-Json -Compress } catch { Write-Output '{}' }",
  "  }",
  "}"
].join("\n");

type ForegroundProbeJson = {
  hasForegroundWindowHandle?: boolean;
  windowReasonCode?: string | null;
  processId?: number;
  appName?: string;
  processName?: string;
  executablePath?: string;
  activeWindowTitle?: string;
};

class WindowsForegroundProbeSession {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";
  private pending: {
    resolve: (value: ForegroundProbeJson | null) => void;
    timer: NodeJS.Timeout;
  } | null = null;
  private sampleQueue: Array<(value: ForegroundProbeJson | null) => void> = [];
  private starting: Promise<void> | null = null;

  async sample(): Promise<ForegroundProbeJson | null> {
    await this.ensureStarted();
    if (!this.isChildHealthy()) {
      this.resetChild();
      await this.ensureStarted();
    }
    if (!this.isChildHealthy()) {
      return null;
    }
    return new Promise((resolve) => {
      this.sampleQueue.push(resolve);
      this.pumpSampleQueue();
    });
  }

  stop(): void {
    this.sampleQueue = [];
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.resolve(null);
      this.pending = null;
    }
    this.resetChild();
  }

  private isChildHealthy(): boolean {
    return Boolean(this.child && !this.child.killed && this.child.stdin?.writable);
  }

  private resetChild(): void {
    if (this.child) {
      try {
        this.child.stdin.write("exit\n");
      } catch {
        // ignore
      }
      try {
        this.child.kill();
      } catch {
        // ignore
      }
    }
    this.child = null;
    this.stdoutBuffer = "";
    this.starting = null;
  }

  private pumpSampleQueue(): void {
    if (this.pending || this.sampleQueue.length === 0 || !this.isChildHealthy()) {
      return;
    }
    const resolve = this.sampleQueue.shift();
    if (!resolve) {
      return;
    }
    const timer = setTimeout(() => {
      this.pending = null;
      resolve(null);
      this.pumpSampleQueue();
    }, SAMPLE_TIMEOUT_MS);
    this.pending = {
      resolve: (value) => {
        clearTimeout(timer);
        this.pending = null;
        resolve(value);
        this.pumpSampleQueue();
      },
      timer
    };
    this.child?.stdin.write("sample\n");
  }

  private async ensureStarted(): Promise<void> {
    if (this.isChildHealthy()) {
      return;
    }
    if (this.starting) {
      await this.starting;
      return;
    }
    this.starting = new Promise((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", windowsForegroundBootstrap],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
      );
      this.child = child;
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        this.stdoutBuffer += chunk;
        this.flushStdoutBuffer();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        logger.warn("foreground-probe-stderr", { message: chunk.toString("utf8").trim() });
      });
      child.on("error", (error) => {
        this.rejectPending();
        this.resetChild();
        reject(error);
      });
      child.on("exit", () => {
        this.rejectPending();
        this.resetChild();
      });
      setTimeout(() => {
        this.starting = null;
        resolve();
      }, 500);
    });
    await this.starting;
  }

  private flushStdoutBuffer(): void {
    const pending = this.pending;
    if (!pending) {
      return;
    }
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        pending.resolve(JSON.parse(trimmed) as ForegroundProbeJson);
        return;
      } catch {
        logger.warn("foreground-probe-parse-failed", { line: trimmed });
      }
    }
  }

  private rejectPending(): void {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.resolve(null);
      this.pending = null;
    }
    while (this.sampleQueue.length > 0) {
      this.sampleQueue.shift()?.(null);
    }
  }
}

let session: WindowsForegroundProbeSession | null = null;

function mapProbeJson(parsed: ForegroundProbeJson): Partial<ActivityContext> | null {
  if (parsed.hasForegroundWindowHandle === false) {
    return null;
  }
  const rawApp = parsed.processName ?? parsed.appName ?? "";
  const executableBase = parsed.executablePath?.split("\\").pop() ?? "";
  const windowTitle = parsed.activeWindowTitle ?? "";
  const application = rawApp || executableBase || (windowTitle ? "unknown" : "");
  if (!application && !windowTitle) {
    return null;
  }
  return {
    application: application || "unknown",
    windowTitle,
    processId: parsed.processId,
    appName: (parsed.appName ?? rawApp) || undefined,
    processName: (parsed.processName ?? parsed.appName ?? rawApp) || undefined,
    executablePath: parsed.executablePath,
    activeWindowTitle: windowTitle || undefined,
    hasForegroundWindowHandle: parsed.hasForegroundWindowHandle,
    windowReasonCode: parsed.windowReasonCode ?? null
  };
}

export async function probeWindowsForegroundContext(): Promise<Partial<ActivityContext> | null> {
  if (process.platform !== "win32") {
    return null;
  }
  try {
    if (!session) {
      session = new WindowsForegroundProbeSession();
    }
    const parsed = await session.sample();
    return parsed ? mapProbeJson(parsed) : null;
  } catch (error) {
    logger.warn("foreground-probe-failed", { error });
    session?.stop();
    session = null;
    return null;
  }
}

export function stopWindowsForegroundProbeSession(): void {
  session?.stop();
  session = null;
}
