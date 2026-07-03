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
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [foreground, input] = await Promise.all([
      probeWindowsForegroundContext(),
      probeWindowsInputSnapshot()
    ]);
    if (input && foreground) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
