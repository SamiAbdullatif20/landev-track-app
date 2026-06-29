import type { ActivityContext } from "./activity-metadata";

export {
  probeWindowsForegroundContextUnified as probeWindowsForegroundContext,
  stopWindowsUnifiedProbeSession as stopWindowsForegroundProbeSession
} from "./windows-unified-probe";

export type { ActivityContext };
