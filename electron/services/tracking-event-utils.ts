export type ActivityMetadataInput = {
  source: string;
  projectId: string | null;
  workDescription: string | null;
  mouseMovePercent?: number;
  totalSamples?: number;
  mouseMoveSamples?: number;
  mouseActiveSeconds?: number;
  trackerElapsedMs?: number;
  rawApplication?: string;
  rawWindowTitle?: string;
  processName?: string;
  application?: string;
  windowTitle?: string;
};

export type NormalizedTrackingMetadata = {
  source: string;
  projectId: string | null;
  workDescription: string | null;
  application: string;
  applicationDisplayName: string;
  applicationVendor: string | null;
  windowTitle: string;
  processName: string;
  rawApplication: string;
  rawWindowTitle: string;
  mouseMovePercent: number;
  totalSamples: number;
  mouseMoveSamples: number;
  mouseActiveSeconds: number;
  trackerElapsedMs: number;
};

const AUTODESK_PROCESS_NAMES = new Set([
  "acad",
  "acadlt",
  "revit",
  "revitworker",
  "inventor",
  "fusion360",
  "fcad",
  "3dsmax",
  "maya",
  "navisworks",
  "roamer",
  "civil3d",
  "aec",
  "adsklicensing",
  "adsklicensingagent",
  "autodesktopapp",
  "genuine",
  "dwf",
  "dwfx"
]);

function stripExeSuffix(value: string): string {
  return value.endsWith(".exe") ? value.slice(0, -4) : value;
}

/** Prefer executable basename (e.g. acad.exe, Revit.exe) for web Apps used reports. */
export function formatProcessNameForPayload(processName: string, executablePath?: string | null): string {
  const fromPath = executablePath?.trim().split(/[/\\]/).pop()?.trim();
  if (fromPath) {
    return fromPath;
  }
  const trimmed = processName.trim();
  if (!trimmed) {
    return "unknown";
  }
  return /\.exe$/i.test(trimmed) ? trimmed : `${trimmed}.exe`;
}

export function isAutodeskProcessName(input: string | null | undefined): boolean {
  const noExe = stripExeSuffix((input ?? "").trim().toLowerCase());
  if (!noExe) return false;
  if (AUTODESK_PROCESS_NAMES.has(noExe)) return true;
  return noExe.startsWith("autodesk") || noExe.startsWith("acad") || noExe.includes("revit");
}

export function resolveApplicationDisplayName(
  rawApplication: string,
  windowTitle: string,
  normalizedApplication: string
): string {
  const title = windowTitle.trim();
  const titleMatchers: Array<[RegExp, string]> = [
    [/autocad/i, "AutoCAD"],
    [/revit/i, "Revit"],
    [/civil\s*3d/i, "Civil 3D"],
    [/inventor/i, "Inventor"],
    [/fusion\s*360|fusion/i, "Fusion"],
    [/3ds\s*max|3dsmax/i, "3ds Max"],
    [/maya/i, "Maya"],
    [/navisworks/i, "Navisworks"],
    [/autodesk/i, "Autodesk"]
  ];
  for (const [pattern, label] of titleMatchers) {
    if (pattern.test(title)) {
      return label;
    }
  }

  const processKey = stripExeSuffix(rawApplication.trim().toLowerCase());
  const processLabels: Record<string, string> = {
    acad: "AutoCAD",
    acadlt: "AutoCAD LT",
    revit: "Revit",
    inventor: "Inventor",
    fusion360: "Fusion",
    fcad: "Fusion",
    "3dsmax": "3ds Max",
    maya: "Maya",
    navisworks: "Navisworks",
    roamer: "Navisworks",
    civil3d: "Civil 3D",
    chrome: "Chrome",
    firefox: "Firefox",
    msedge: "Edge",
    edge: "Edge",
    code: "VS Code",
    vscode: "VS Code",
    cursor: "Cursor",
    devenv: "Visual Studio",
    olk: "Outlook",
    zoom: "Zoom",
    "ms-teams": "Teams",
    msteams: "Teams",
    explorer: "File Explorer",
    winword: "Word",
    excel: "Excel",
    powerpnt: "PowerPoint",
    outlook: "Outlook",
    teams: "Teams",
    slack: "Slack",
    notepad: "Notepad",
    "notepad++": "Notepad++"
  };
  if (processLabels[processKey]) {
    return processLabels[processKey];
  }
  if (normalizedApplication === "autodesk") {
    return "Autodesk";
  }
  if (rawApplication.trim()) {
    return rawApplication.trim();
  }
  if (normalizedApplication !== "unknown") {
    return normalizedApplication;
  }
  return "Unknown";
}

export function normalizeAppName(input: string | null | undefined): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return "unknown";
  const noExe = stripExeSuffix(raw);
  if (noExe === "chrome") return "chrome";
  if (noExe === "firefox") return "firefox";
  if (noExe === "msedge" || noExe === "edge") return "edge";
  if (noExe === "code" || noExe === "vscode") return "vscode";
  if (noExe === "explorer") return "explorer";
  if (noExe === "winword") return "word";
  if (noExe === "excel") return "excel";
  if (noExe === "powerpnt" || noExe === "powerpoint") return "powerpoint";
  if (noExe === "outlook") return "outlook";
  if (noExe === "teams") return "teams";
  if (noExe === "ms-teams" || noExe === "msteams") return "teams";
  if (noExe === "zoom") return "zoom";
  if (noExe === "cursor") return "cursor";
  if (noExe === "slack") return "slack";
  if (noExe === "notepad") return "notepad";
  if (isAutodeskProcessName(noExe)) return "autodesk";
  return noExe || "unknown";
}

export function buildTrackingMetadata(input: ActivityMetadataInput): {
  metadata: NormalizedTrackingMetadata;
  usedFallbackAppName: boolean;
  usedNormalizedName: boolean;
  missingWindowTitle: boolean;
} {
  const rawApplication = (input.rawApplication ?? input.application ?? "").trim();
  const normalizedApplication = normalizeAppName(rawApplication);
  const processName = (input.processName ?? rawApplication).trim() || "unknown";
  const rawWindowTitle = (input.rawWindowTitle ?? input.windowTitle ?? "").trim();
  const windowTitle = rawWindowTitle;

  const application = normalizedApplication || "unknown";
  const applicationDisplayName = resolveApplicationDisplayName(
    rawApplication,
    windowTitle,
    application
  );

  const metadata: NormalizedTrackingMetadata = {
    source: input.source,
    projectId: input.projectId,
    workDescription: input.workDescription,
    application,
    applicationDisplayName,
    applicationVendor: application === "autodesk" ? "Autodesk" : null,
    windowTitle: windowTitle || "",
    processName,
    rawApplication: rawApplication || "unknown",
    rawWindowTitle: rawWindowTitle || "",
    mouseMovePercent: Number(input.mouseMovePercent ?? 0),
    totalSamples: Number(input.totalSamples ?? 0),
    mouseMoveSamples: Number(input.mouseMoveSamples ?? 0),
    mouseActiveSeconds: Number(input.mouseActiveSeconds ?? 0),
    trackerElapsedMs: Number(input.trackerElapsedMs ?? 0)
  };

  return {
    metadata,
    usedFallbackAppName: metadata.application === "unknown",
    usedNormalizedName: metadata.application !== metadata.rawApplication.toLowerCase(),
    missingWindowTitle: metadata.windowTitle.length === 0
  };
}
