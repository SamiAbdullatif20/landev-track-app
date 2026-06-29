import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { logger } from "../config/logger";
import type { ActivityContext } from "./activity-metadata";
import type { WindowsInputSnapshot } from "./input-probe-windows";

const SAMPLE_TIMEOUT_MS = 4000;

const windowsUnifiedBootstrap = [
  "Add-Type @\"",
  "using System; using System.Diagnostics; using System.Runtime.InteropServices; using System.Text; using System.Collections.Generic; using System.Threading;",
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
  "public class LandevInputProbe {",
  "  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }",
  "  [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }",
  "  [StructLayout(LayoutKind.Sequential)] public struct MSLLHOOKSTRUCT { public POINT pt; public uint mouseData; public uint flags; public uint time; public IntPtr dwExtraInfo; }",
  "  private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);",
  "  [DllImport(\"user32.dll\")] public static extern bool GetCursorPos(out POINT lpPoint);",
  "  [DllImport(\"user32.dll\")] public static extern short GetAsyncKeyState(int vKey);",
  "  [DllImport(\"user32.dll\")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO lii);",
  "  [DllImport(\"user32.dll\", SetLastError=true)] private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);",
  "  [DllImport(\"user32.dll\", SetLastError=true)] [return: MarshalAs(UnmanagedType.Bool)] private static extern bool UnhookWindowsHookEx(IntPtr hhk);",
  "  [DllImport(\"user32.dll\")] private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);",
  "  [DllImport(\"kernel32.dll\", CharSet=CharSet.Auto, SetLastError=true)] private static extern IntPtr GetModuleHandle(string lpModuleName);",
  "  [DllImport(\"user32.dll\")] private static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);",
  "  [DllImport(\"user32.dll\")] private static extern bool TranslateMessage([In] ref MSG lpMsg);",
  "  [DllImport(\"user32.dll\")] private static extern IntPtr DispatchMessage([In] ref MSG lpmsg);",
  "  [StructLayout(LayoutKind.Sequential)] private struct MSG { public IntPtr hwnd; public uint message; public UIntPtr wParam; public IntPtr lParam; public uint time; public POINT pt; public uint lPrivate; }",
  "  private const int WH_MOUSE_LL = 14;",
  "  private const int WM_MOUSEMOVE = 0x0200;",
  "  private const int WM_LBUTTONDOWN = 0x0201;",
  "  private const int WM_RBUTTONDOWN = 0x0204;",
  "  private const int WM_MBUTTONDOWN = 0x0207;",
  "  private const int WM_XBUTTONDOWN = 0x020B;",
  "  private const int WM_MOUSEWHEEL = 0x020A;",
  "  private static readonly object _lock = new object();",
  "  private static IntPtr _hookHandle = IntPtr.Zero;",
  "  private static LowLevelMouseProc _hookProc = HookCallback;",
  "  private static int _lastX = 0;",
  "  private static int _lastY = 0;",
  "  private static bool _hasLastPoint = false;",
  "  private static int _moveDistancePx = 0;",
  "  private static int _clickCount = 0;",
  "  private static int _scrollCount = 0;",
  "  private static bool _initialized = false;",
  "  private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {",
  "    if (nCode >= 0) {",
  "      int msg = wParam.ToInt32();",
  "      var data = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));",
  "      lock (_lock) {",
  "        if (msg == WM_MOUSEMOVE) {",
  "          if (_hasLastPoint) {",
  "            int dx = data.pt.X - _lastX;",
  "            int dy = data.pt.Y - _lastY;",
  "            _moveDistancePx += (int)Math.Sqrt((dx * dx) + (dy * dy));",
  "          }",
  "          _lastX = data.pt.X; _lastY = data.pt.Y; _hasLastPoint = true;",
  "        } else if (msg == WM_LBUTTONDOWN || msg == WM_RBUTTONDOWN || msg == WM_MBUTTONDOWN || msg == WM_XBUTTONDOWN) {",
  "          _clickCount += 1;",
  "        } else if (msg == WM_MOUSEWHEEL) {",
  "          _scrollCount += 1;",
  "        }",
  "      }",
  "    }",
  "    return CallNextHookEx(_hookHandle, nCode, wParam, lParam);",
  "  }",
  "  private static void EnsureHookStarted() {",
  "    if (_initialized) { return; }",
  "    _initialized = true;",
  "    var t = new Thread(() => {",
  "      _hookHandle = SetWindowsHookEx(WH_MOUSE_LL, _hookProc, GetModuleHandle(null), 0);",
  "      MSG msg; while (GetMessage(out msg, IntPtr.Zero, 0, 0)) { TranslateMessage(ref msg); DispatchMessage(ref msg); }",
  "      if (_hookHandle != IntPtr.Zero) { UnhookWindowsHookEx(_hookHandle); _hookHandle = IntPtr.Zero; }",
  "    });",
  "    t.IsBackground = true;",
  "    t.SetApartmentState(ApartmentState.STA);",
  "    t.Start();",
  "  }",
  "  public static object Sample() {",
  "    EnsureHookStarted();",
  "    var p = new POINT(); GetCursorPos(out p);",
  "    var keys = new List<int>();",
  "    for (int vk = 8; vk <= 254; vk++) { if ((GetAsyncKeyState(vk) & 0x8000) != 0) keys.Add(vk); }",
  "    var lii = new LASTINPUTINFO(); lii.cbSize = 8;",
  "    uint idleMs = 0;",
  "    if (GetLastInputInfo(ref lii)) { idleMs = (uint)Environment.TickCount - lii.dwTime; }",
  "    int moveDistancePx = 0; int clickCount = 0; int scrollCount = 0;",
  "    lock (_lock) { moveDistancePx = _moveDistancePx; clickCount = _clickCount; scrollCount = _scrollCount; _moveDistancePx = 0; _clickCount = 0; _scrollCount = 0; }",
  "    return new { x = p.X, y = p.Y, keysDown = keys.ToArray(), idleMs, mouseMoveDistancePx = moveDistancePx, clickCount = clickCount, scrollCount = scrollCount };",
  "  }",
  "}",
  "\"@",
  "while ($true) {",
  "  $line = [Console]::In.ReadLine()",
  "  if ($line -eq 'exit') { break }",
  "  if ($line -eq 'input') {",
  "    try { [LandevInputProbe]::Sample() | ConvertTo-Json -Compress } catch { Write-Output '{}' }",
  "  }",
  "  if ($line -eq 'foreground') {",
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

type ProbeCommand = "input" | "foreground";

type QueuedProbeRequest = {
  command: ProbeCommand;
  resolve: (value: WindowsInputSnapshot | ForegroundProbeJson | null) => void;
};

class WindowsUnifiedProbeSession {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";
  private pending: (QueuedProbeRequest & { timer: NodeJS.Timeout }) | null = null;
  private sampleQueue: QueuedProbeRequest[] = [];
  private starting: Promise<void> | null = null;

  async sampleInput(): Promise<WindowsInputSnapshot | null> {
    await this.ensureStarted();
    if (!this.isChildHealthy()) {
      this.resetChild();
      await this.ensureStarted();
    }
    if (!this.isChildHealthy()) {
      return null;
    }
    const result = await this.request("input");
    if (!result || typeof result !== "object") {
      return null;
    }
    const parsed = result as Record<string, unknown>;
    if (parsed.x === undefined && parsed.y === undefined) {
      return null;
    }
    return {
      x: Number(parsed.x ?? 0),
      y: Number(parsed.y ?? 0),
      keysDown: Array.isArray(parsed.keysDown) ? parsed.keysDown.map((vk) => Number(vk)) : [],
      idleMs: Math.max(0, Number(parsed.idleMs ?? 0)),
      mouseMoveDistancePx: Math.max(0, Math.floor(Number(parsed.mouseMoveDistancePx ?? 0))),
      clickCount: Math.max(0, Math.floor(Number(parsed.clickCount ?? 0))),
      scrollCount: Math.max(0, Math.floor(Number(parsed.scrollCount ?? 0)))
    };
  }

  async sampleForeground(): Promise<ForegroundProbeJson | null> {
    await this.ensureStarted();
    if (!this.isChildHealthy()) {
      this.resetChild();
      await this.ensureStarted();
    }
    if (!this.isChildHealthy()) {
      return null;
    }
    const result = await this.request("foreground");
    return result && typeof result === "object" ? (result as ForegroundProbeJson) : null;
  }

  private request(command: ProbeCommand): Promise<WindowsInputSnapshot | ForegroundProbeJson | null> {
    return new Promise((resolve) => {
      this.sampleQueue.push({ command, resolve });
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
    const next = this.sampleQueue.shift();
    if (!next) {
      return;
    }
    const timer = setTimeout(() => {
      this.pending = null;
      next.resolve(null);
      this.pumpSampleQueue();
    }, SAMPLE_TIMEOUT_MS);
    this.pending = {
      command: next.command,
      resolve: (value) => {
        clearTimeout(timer);
        this.pending = null;
        next.resolve(value);
        this.pumpSampleQueue();
      },
      timer
    };
    this.child?.stdin.write(`${next.command}\n`);
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
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", windowsUnifiedBootstrap],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
      );
      this.child = child;
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        this.stdoutBuffer += chunk;
        this.flushStdoutBuffer();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        logger.warn("unified-probe-stderr", { message: chunk.toString("utf8").trim() });
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
        pending.resolve(JSON.parse(trimmed) as WindowsInputSnapshot | ForegroundProbeJson);
        return;
      } catch {
        logger.warn("unified-probe-parse-failed", { line: trimmed });
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
      this.sampleQueue.shift()?.resolve(null);
    }
  }
}

let unifiedSession: WindowsUnifiedProbeSession | null = null;

function getSession(): WindowsUnifiedProbeSession {
  if (!unifiedSession) {
    unifiedSession = new WindowsUnifiedProbeSession();
  }
  return unifiedSession;
}

function mapForegroundJson(parsed: ForegroundProbeJson): Partial<ActivityContext> | null {
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

export async function probeWindowsInputSnapshotUnified(): Promise<WindowsInputSnapshot | null> {
  if (process.platform !== "win32") {
    return null;
  }
  try {
    return await getSession().sampleInput();
  } catch (error) {
    logger.warn("unified-input-probe-failed", { error });
    stopWindowsUnifiedProbeSession();
    return null;
  }
}

export async function probeWindowsForegroundContextUnified(): Promise<Partial<ActivityContext> | null> {
  if (process.platform !== "win32") {
    return null;
  }
  try {
    const parsed = await getSession().sampleForeground();
    return parsed ? mapForegroundJson(parsed) : null;
  } catch (error) {
    logger.warn("unified-foreground-probe-failed", { error });
    stopWindowsUnifiedProbeSession();
    return null;
  }
}

export function stopWindowsUnifiedProbeSession(): void {
  unifiedSession?.stop();
  unifiedSession = null;
}
