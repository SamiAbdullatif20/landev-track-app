import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ActivityContext = {
  platform: NodeJS.Platform;
  collectedAt: string;
  activeWindowTitle?: string;
  appName?: string;
  processId?: number;
};

const windowsProbeScript = [
  "$signature = '[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);'",
  "Add-Type -MemberDefinition $signature -Name Win32GetForegroundWindow -Namespace Win32Functions | Out-Null",
  "$hwnd = [Win32Functions.Win32GetForegroundWindow]::GetForegroundWindow()",
  "$pid = 0",
  "[Win32Functions.Win32GetForegroundWindow]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null",
  "$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue",
  "if ($proc) {",
  "  $obj = [PSCustomObject]@{ processId = $proc.Id; appName = $proc.ProcessName; activeWindowTitle = $proc.MainWindowTitle }",
  "  $obj | ConvertTo-Json -Compress",
  "}"
].join("; ");

export async function collectActivityContext(): Promise<ActivityContext> {
  const base: ActivityContext = {
    platform: process.platform,
    collectedAt: new Date().toISOString()
  };

  if (process.platform !== "win32") {
    return base;
  }

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", windowsProbeScript],
      { timeout: 1800, windowsHide: true }
    );

    if (!stdout.trim()) {
      return base;
    }

    const parsed = JSON.parse(stdout.trim()) as {
      processId?: number;
      appName?: string;
      activeWindowTitle?: string;
    };

    return {
      ...base,
      processId: parsed.processId,
      appName: parsed.appName,
      activeWindowTitle: parsed.activeWindowTitle
    };
  } catch {
    return base;
  }
}
