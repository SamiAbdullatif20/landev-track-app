import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../config/logger";
import type { ActivityContext } from "./activity-metadata";

const execFileAsync = promisify(execFile);

const meetingWindowScanScript = [
  "Add-Type @\"",
  "using System; using System.Collections.Generic; using System.Diagnostics; using System.Runtime.InteropServices; using System.Text;",
  "public class LandevMeetingWindowScan {",
  "  private delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);",
  "  [DllImport(\"user32.dll\")] private static extern bool EnumWindows(EnumProc lpEnum, IntPtr lParam);",
  "  [DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);",
  "  [DllImport(\"user32.dll\")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);",
  "  private static List<object> _rows = new List<object>();",
  "  private static bool EnumCb(IntPtr hWnd, IntPtr lParam) {",
  "    var sb = new StringBuilder(2048);",
  "    int len = GetWindowText(hWnd, sb, sb.Capacity);",
  "    if (len <= 0) { return true; }",
  "    uint pid = 0;",
  "    GetWindowThreadProcessId(hWnd, out pid);",
  "    string proc = null; string exe = null;",
  "    try {",
  "      var p = Process.GetProcessById((int)pid);",
  "      proc = p.ProcessName;",
  "      try { if (p.MainModule != null) { exe = p.MainModule.FileName; } } catch { }",
  "    } catch { return true; }",
  "    _rows.Add(new { processName = proc, activeWindowTitle = sb.ToString(), executablePath = exe });",
  "    return true;",
  "  }",
  "  public static object[] Scan() {",
  "    _rows = new List<object>();",
  "    EnumWindows(EnumCb, IntPtr.Zero);",
  "    return _rows.ToArray();",
  "  }",
  "}",
  "\"@",
  "[LandevMeetingWindowScan]::Scan() | ConvertTo-Json -Compress -Depth 4"
].join("\n");

type MeetingWindowRow = {
  processName?: string;
  activeWindowTitle?: string;
  executablePath?: string;
};

function mapRow(row: MeetingWindowRow): ActivityContext {
  const processName = row.processName ?? "";
  const windowTitle = row.activeWindowTitle ?? "";
  return {
    platform: "win32",
    collectedAt: new Date().toISOString(),
    processName,
    appName: processName,
    application: processName,
    windowTitle,
    activeWindowTitle: windowTitle,
    executablePath: row.executablePath
  };
}

export async function probeMeetingWindowContexts(): Promise<ActivityContext[]> {
  if (process.platform !== "win32") {
    return [];
  }
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", meetingWindowScanScript],
      { timeout: 5000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }
    );
    const trimmed = stdout.trim();
    if (!trimmed) {
      return [];
    }
    const parsed = JSON.parse(trimmed) as MeetingWindowRow | MeetingWindowRow[];
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .filter((row) => Boolean((row.processName ?? "").trim() || (row.activeWindowTitle ?? "").trim()))
      .map(mapRow);
  } catch (error) {
    logger.warn("meeting-window-probe-failed", { error });
    return [];
  }
}
