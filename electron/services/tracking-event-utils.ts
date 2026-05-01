export type ActivityMetadataInput = {
  source: string;
  projectId: string | null;
  workDescription: string | null;
  mouseMovePercent?: number;
  totalSamples?: number;
  mouseMoveSamples?: number;
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
  windowTitle: string;
  processName: string;
  rawApplication: string;
  rawWindowTitle: string;
  mouseMovePercent: number;
  totalSamples: number;
  mouseMoveSamples: number;
  trackerElapsedMs: number;
};

export function normalizeAppName(input: string | null | undefined): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return "unknown";
  const noExe = raw.endsWith(".exe") ? raw.slice(0, -4) : raw;
  if (noExe === "chrome") return "chrome";
  if (noExe === "firefox") return "firefox";
  if (noExe === "msedge" || noExe === "edge") return "edge";
  if (noExe === "code" || noExe === "vscode") return "vscode";
  if (noExe === "acad" || noExe === "revit" || noExe.startsWith("autodesk")) return "autodesk";
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

  const metadata: NormalizedTrackingMetadata = {
    source: input.source,
    projectId: input.projectId,
    workDescription: input.workDescription,
    application: normalizedApplication || "unknown",
    windowTitle: windowTitle || "",
    processName,
    rawApplication: rawApplication || "unknown",
    rawWindowTitle: rawWindowTitle || "",
    mouseMovePercent: Number(input.mouseMovePercent ?? 0),
    totalSamples: Number(input.totalSamples ?? 0),
    mouseMoveSamples: Number(input.mouseMoveSamples ?? 0),
    trackerElapsedMs: Number(input.trackerElapsedMs ?? 0)
  };

  return {
    metadata,
    usedFallbackAppName: metadata.application === "unknown",
    usedNormalizedName: metadata.application !== metadata.rawApplication.toLowerCase(),
    missingWindowTitle: metadata.windowTitle.length === 0
  };
}
