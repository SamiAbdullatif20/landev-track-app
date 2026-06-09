import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { logger } from "../config/logger";

export type WindowsInputSnapshot = {
  x: number;
  y: number;
  keysDown: number[];
  idleMs: number;
  mouseMoveDistancePx: number;
  clickCount: number;
  scrollCount: number;
};

const windowsInputBootstrap = [
  "Add-Type @\"",
  "using System; using System.Runtime.InteropServices; using System.Collections.Generic; using System.Threading;",
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
  "  if ($line -eq 'sample') {",
  "    try { [LandevInputProbe]::Sample() | ConvertTo-Json -Compress } catch { Write-Output '{}' }",
  "  }",
  "}"
].join("\n");

class WindowsInputProbeSession {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = "";
  private pending: {
    resolve: (value: WindowsInputSnapshot | null) => void;
    timer: NodeJS.Timeout;
  } | null = null;
  private sampleQueue: Array<(value: WindowsInputSnapshot | null) => void> = [];
  private starting: Promise<void> | null = null;

  async sample(): Promise<WindowsInputSnapshot | null> {
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
    }, 4000);
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
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", windowsInputBootstrap],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
      );
      this.child = child;
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        this.stdoutBuffer += chunk;
        this.flushStdoutBuffer();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        logger.warn("input-probe-stderr", { message: chunk.toString("utf8").trim() });
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
        const parsed = JSON.parse(trimmed) as {
          x?: number;
          y?: number;
          keysDown?: number[];
          idleMs?: number;
          mouseMoveDistancePx?: number;
          clickCount?: number;
          scrollCount?: number;
        };
        if (parsed.x === undefined && parsed.y === undefined) {
          pending.resolve(null);
          return;
        }
        pending.resolve({
          x: Number(parsed.x ?? 0),
          y: Number(parsed.y ?? 0),
          keysDown: Array.isArray(parsed.keysDown) ? parsed.keysDown.map((vk) => Number(vk)) : [],
          idleMs: Math.max(0, Number(parsed.idleMs ?? 0)),
          mouseMoveDistancePx: Math.max(0, Math.floor(Number(parsed.mouseMoveDistancePx ?? 0))),
          clickCount: Math.max(0, Math.floor(Number(parsed.clickCount ?? 0))),
          scrollCount: Math.max(0, Math.floor(Number(parsed.scrollCount ?? 0)))
        });
        return;
      } catch {
        logger.warn("input-probe-parse-failed", { line: trimmed });
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

let session: WindowsInputProbeSession | null = null;

export async function probeWindowsInputSnapshot(): Promise<WindowsInputSnapshot | null> {
  if (process.platform !== "win32") {
    return null;
  }
  try {
    if (!session) {
      session = new WindowsInputProbeSession();
    }
    return await session.sample();
  } catch (error) {
    logger.warn("input-probe-failed", { error });
    session?.stop();
    session = null;
    return null;
  }
}

export function stopWindowsInputProbeSession(): void {
  session?.stop();
  session = null;
}
