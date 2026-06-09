import { stopWindowsForegroundProbeSession } from "./activity-metadata";
import { probeWindowsForegroundContext } from "./foreground-probe-windows";
import { probeWindowsInputSnapshot, stopWindowsInputProbeSession } from "./input-probe-windows";
import { clearAppFocusDedupeState } from "./tracking-app-focus";

export function stopAllWindowsProbeSessions(): void {
  stopWindowsForegroundProbeSession();
  stopWindowsInputProbeSession();
}

export async function resetAndWarmUpWindowsProbes(): Promise<void> {
  stopAllWindowsProbeSessions();
  clearAppFocusDedupeState();
  await Promise.all([probeWindowsForegroundContext(), probeWindowsInputSnapshot()]);
}
