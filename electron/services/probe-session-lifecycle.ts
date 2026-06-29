import { probeWindowsForegroundContext } from "./foreground-probe-windows";
import { probeWindowsInputSnapshot } from "./input-probe-windows";
import { stopWindowsUnifiedProbeSession } from "./windows-unified-probe";
import { clearAppFocusDedupeState } from "./tracking-app-focus";

export function stopAllWindowsProbeSessions(): void {
  stopWindowsUnifiedProbeSession();
}

export async function resetAndWarmUpWindowsProbes(): Promise<void> {
  stopAllWindowsProbeSessions();
  clearAppFocusDedupeState();
  await Promise.all([probeWindowsForegroundContext(), probeWindowsInputSnapshot()]);
}
