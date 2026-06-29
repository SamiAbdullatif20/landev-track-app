export type WindowsInputSnapshot = {
  x: number;
  y: number;
  keysDown: number[];
  idleMs: number;
  mouseMoveDistancePx: number;
  clickCount: number;
  scrollCount: number;
};

export {
  probeWindowsInputSnapshotUnified as probeWindowsInputSnapshot,
  stopWindowsUnifiedProbeSession as stopWindowsInputProbeSession
} from "./windows-unified-probe";
