import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "../config/logger";

const execFileAsync = promisify(execFile);

export type ForegroundApp = {
  applicationDisplayName: string;
  application: string;
  processName: string;
  windowTitle: string;
  processId: number | null;
};

const DENYLIST = new Set([
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "cmd",
  "cmd.exe",
  "conhost",
  "conhost.exe",
  "wt",
  "wt.exe",
  "openconsole",
  "openconsole.exe",
  "WindowServer",
  "dwm",
  "dwm.exe",
  "explorer", // optional: keep explorer as Desktop — LogWork often shows it; keep it
]);

/** Shell/helper noise we never list as apps used. */
const HARD_DENY = new Set([
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "cmd",
  "cmd.exe",
  "conhost",
  "conhost.exe",
  "wt",
  "wt.exe",
  "openconsole",
  "openconsole.exe"
]);

const DISPLAY_MAP: Record<string, string> = {
  chrome: "Google Chrome",
  "chrome.exe": "Google Chrome",
  msedge: "Microsoft Edge",
  "msedge.exe": "Microsoft Edge",
  firefox: "Firefox",
  "firefox.exe": "Firefox",
  code: "Visual Studio Code",
  "code.exe": "Visual Studio Code",
  devenv: "Visual Studio",
  "devenv.exe": "Visual Studio",
  acad: "AutoCAD",
  "acad.exe": "AutoCAD",
  revit: "Revit",
  "revit.exe": "Revit",
  zoom: "Zoom",
  "zoom.exe": "Zoom",
  teams: "Microsoft Teams",
  "ms-teams.exe": "Microsoft Teams",
  "teams.exe": "Microsoft Teams",
  slack: "Slack",
  "slack.exe": "Slack",
  outlook: "Outlook",
  "outlook.exe": "Outlook",
  WINWORD: "Word",
  "winword.exe": "Word",
  EXCEL: "Excel",
  "excel.exe": "Excel",
  powerpnt: "PowerPoint",
  "powerpnt.exe": "PowerPoint",
  notion: "Notion",
  "notion.exe": "Notion",
  figma: "Figma",
  "figma.exe": "Figma",
  explorer: "File Explorer",
  "explorer.exe": "File Explorer"
};

function slugify(processName: string): string {
  const base = processName.replace(/\.exe$/i, "").toLowerCase();
  if (/acad|revit|autodesk/.test(base)) return "autodesk";
  if (base === "msedge" || base === "edge") return "edge";
  if (base === "code") return "vscode";
  if (base.includes("teams")) return "teams";
  return base || "unknown";
}

function displayNameFor(processName: string, windowTitle: string): string {
  const key = processName.toLowerCase();
  if (DISPLAY_MAP[key]) return DISPLAY_MAP[key];
  const noExe = processName.replace(/\.exe$/i, "");
  if (DISPLAY_MAP[noExe.toLowerCase()]) return DISPLAY_MAP[noExe.toLowerCase()];
  if (windowTitle.trim()) {
    const cut = windowTitle.split(" - ").pop()?.trim();
    if (cut && cut.length <= 40) return cut;
  }
  return noExe || "Unknown";
}

export function isDeniedProcess(processName: string): boolean {
  return HARD_DENY.has(processName.toLowerCase());
}

const windowsProbeScript = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class FgWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
"@
$hwnd = [FgWin]::GetForegroundWindow()
if ($hwnd -eq [IntPtr]::Zero) { Write-Output '{"ok":false}'; exit }
$pidOut = 0
[void][FgWin]::GetWindowThreadProcessId($hwnd, [ref]$pidOut)
$sb = New-Object System.Text.StringBuilder 512
[void][FgWin]::GetWindowText($hwnd, $sb, $sb.Capacity)
$title = $sb.ToString()
$proc = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
$name = if ($proc) { $proc.ProcessName } else { '' }
$exe = if ($proc -and $proc.Path) { Split-Path $proc.Path -Leaf } else { if ($name) { "$name.exe" } else { '' } }
$obj = @{ ok = $true; processId = $pidOut; processName = $exe; processBase = $name; windowTitle = $title }
$obj | ConvertTo-Json -Compress
`.trim();

let lastProbeAt = 0;
let lastProbe: ForegroundApp | null = null;

export async function probeForegroundApp(): Promise<ForegroundApp | null> {
  if (process.platform !== "win32") {
    return null;
  }

  // Light cache so rapid samplers don't spawn PowerShell every call.
  const now = Date.now();
  if (lastProbe && now - lastProbeAt < 800) {
    return lastProbe;
  }

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", windowsProbeScript],
      { windowsHide: true, timeout: 2500, maxBuffer: 1024 * 64 }
    );
    const text = String(stdout || "").trim();
    if (!text) return null;
    const parsed = JSON.parse(text) as {
      ok?: boolean;
      processId?: number;
      processName?: string;
      processBase?: string;
      windowTitle?: string;
    };
    if (!parsed.ok) return null;
    const processName = (parsed.processName || `${parsed.processBase || ""}.exe` || "").trim();
    if (!processName || isDeniedProcess(processName) || isDeniedProcess(parsed.processBase || "")) {
      return null;
    }
    const windowTitle = String(parsed.windowTitle ?? "").trim();
    const applicationDisplayName = displayNameFor(processName, windowTitle);
    const application = slugify(processName);
    const result: ForegroundApp = {
      applicationDisplayName,
      application,
      processName,
      windowTitle,
      processId: typeof parsed.processId === "number" ? parsed.processId : null
    };
    lastProbe = result;
    lastProbeAt = now;
    void DENYLIST;
    return result;
  } catch (error) {
    logger.warn("foreground-probe-failed", {
      error: error instanceof Error ? error.message : "unknown"
    });
    return null;
  }
}
