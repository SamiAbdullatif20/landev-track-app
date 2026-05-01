import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ActivityContext = {
  platform: NodeJS.Platform;
  collectedAt: string;
  application?: string;
  windowTitle?: string;
  activeWindowTitle?: string;
  appName?: string;
  processName?: string;
  executablePath?: string;
  processId?: number;
  hasForegroundWindowHandle?: boolean;
  windowReasonCode?: string | null;
  sourceModule?: string;
};

const windowsProbeScript = [
  "$signature = '[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId); [DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);'",
  "Add-Type -MemberDefinition $signature -Name Win32Foreground -Namespace Win32Functions | Out-Null",
  "$hwnd = [Win32Functions.Win32Foreground]::GetForegroundWindow()",
  "$hasHwnd = $hwnd -ne [IntPtr]::Zero",
  "if (-not $hasHwnd) { [PSCustomObject]@{ hasForegroundWindowHandle = $false; windowReasonCode = 'null_hwnd' } | ConvertTo-Json -Compress; return }",
  "$pid = 0",
  "[Win32Functions.Win32Foreground]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null",
  "$sb = New-Object System.Text.StringBuilder 2048",
  "$titleLen = [Win32Functions.Win32Foreground]::GetWindowText($hwnd, $sb, $sb.Capacity)",
  "$winTitle = if ($titleLen -gt 0) { $sb.ToString() } else { '' }",
  "$reason = if ($titleLen -eq 0) { 'empty_title' } else { $null }",
  "$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue",
  "if (-not $proc) { [PSCustomObject]@{ hasForegroundWindowHandle = $true; windowReasonCode = 'process_not_found'; activeWindowTitle = $winTitle } | ConvertTo-Json -Compress; return }",
  "$obj = [PSCustomObject]@{ hasForegroundWindowHandle = $true; windowReasonCode = $reason; processId = $proc.Id; appName = $proc.ProcessName; processName = $proc.ProcessName; executablePath = $proc.Path; activeWindowTitle = $winTitle }",
  "$obj | ConvertTo-Json -Compress"
].join("; ");

export async function collectActivityContext(): Promise<ActivityContext> {
  const base: ActivityContext = {
    platform: process.platform,
    collectedAt: new Date().toISOString(),
    sourceModule: "activity-metadata.collectActivityContext"
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
      hasForegroundWindowHandle?: boolean;
      windowReasonCode?: string | null;
      processId?: number;
      appName?: string;
      processName?: string;
      executablePath?: string;
      activeWindowTitle?: string;
    };
    const rawApp = parsed.processName ?? parsed.appName ?? "";
    const executableBase = parsed.executablePath
      ? parsed.executablePath.split("\\").pop() ?? ""
      : "";
    const application = rawApp || executableBase || parsed.appName || "unknown";
    const windowTitle = parsed.activeWindowTitle ?? "";

    return {
      ...base,
      application,
      windowTitle,
      processId: parsed.processId,
      appName: parsed.appName,
      processName: parsed.processName ?? parsed.appName,
      executablePath: parsed.executablePath,
      activeWindowTitle: parsed.activeWindowTitle,
      hasForegroundWindowHandle: parsed.hasForegroundWindowHandle,
      windowReasonCode: parsed.windowReasonCode ?? null
    };
  } catch {
    return {
      ...base,
      hasForegroundWindowHandle: false,
      windowReasonCode: "collector_error"
    };
  }
}
