import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  probeWindowsForegroundContext,
  stopWindowsForegroundProbeSession
} from "./foreground-probe-windows";

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
  "$procId = 0",
  "[Win32Functions.Win32Foreground]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null",
  "$sb = New-Object System.Text.StringBuilder 2048",
  "$titleLen = [Win32Functions.Win32Foreground]::GetWindowText($hwnd, $sb, $sb.Capacity)",
  "$winTitle = if ($titleLen -gt 0) { $sb.ToString() } else { '' }",
  "$reason = if ($titleLen -eq 0) { 'empty_title' } else { $null }",
  "$proc = Get-Process -Id $procId -ErrorAction SilentlyContinue",
  "if (-not $proc) { [PSCustomObject]@{ hasForegroundWindowHandle = $true; windowReasonCode = 'process_not_found'; activeWindowTitle = $winTitle } | ConvertTo-Json -Compress; return }",
  "$obj = [PSCustomObject]@{ hasForegroundWindowHandle = $true; windowReasonCode = $reason; processId = $proc.Id; appName = $proc.ProcessName; processName = $proc.ProcessName; executablePath = $proc.Path; activeWindowTitle = $winTitle }",
  "$obj | ConvertTo-Json -Compress"
].join("; ");

async function collectViaOneShotProbe(): Promise<Partial<ActivityContext> | null> {
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", windowsProbeScript],
      { timeout: 1800, windowsHide: true }
    );
    if (!stdout.trim()) {
      return null;
    }
    const parsed = JSON.parse(stdout.trim()) as {
      processName?: string;
      appName?: string;
      executablePath?: string;
      activeWindowTitle?: string;
      processId?: number;
      hasForegroundWindowHandle?: boolean;
      windowReasonCode?: string | null;
    };
    const rawApp = parsed.processName ?? parsed.appName ?? "";
    const executableBase = parsed.executablePath?.split("\\").pop() ?? "";
    return {
      application: rawApp || executableBase || parsed.appName || "unknown",
      windowTitle: parsed.activeWindowTitle ?? "",
      processId: parsed.processId,
      appName: parsed.appName,
      processName: parsed.processName ?? parsed.appName,
      executablePath: parsed.executablePath,
      activeWindowTitle: parsed.activeWindowTitle,
      hasForegroundWindowHandle: parsed.hasForegroundWindowHandle,
      windowReasonCode: parsed.windowReasonCode ?? null
    };
  } catch {
    return null;
  }
}

export async function collectActivityContext(): Promise<ActivityContext> {
  const base: ActivityContext = {
    platform: process.platform,
    collectedAt: new Date().toISOString(),
    sourceModule: "activity-metadata.collectActivityContext"
  };

  if (process.platform !== "win32") {
    return base;
  }

  const probed = (await probeWindowsForegroundContext()) ?? (await collectViaOneShotProbe());
  if (!probed) {
    return { ...base, hasForegroundWindowHandle: false, windowReasonCode: "collector_error" };
  }
  return { ...base, ...probed };
}

export { stopWindowsForegroundProbeSession };
