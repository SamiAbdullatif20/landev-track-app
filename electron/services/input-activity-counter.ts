import type { WindowsInputSnapshot } from "./input-probe-windows";
import { cursorTravelPx, isSignificantMouseMove } from "./mouse-activity-metrics";

export class InputActivityCounter {
  private mouseMoveCount = 0;
  private keyPressCount = 0;
  private clickCount = 0;
  private scrollCount = 0;
  private lastX: number | null = null;
  private lastY: number | null = null;
  private previousKeysDown = new Set<number>();

  ingest(snapshot: WindowsInputSnapshot): void {
    const hookTravel = Math.max(0, snapshot.mouseMoveDistancePx ?? 0);
    if (isSignificantMouseMove(hookTravel)) {
      this.mouseMoveCount += 1;
    } else if (this.lastX !== null && this.lastY !== null) {
      const pollTravel = cursorTravelPx(this.lastX, this.lastY, snapshot.x, snapshot.y);
      if (isSignificantMouseMove(pollTravel)) {
        this.mouseMoveCount += 1;
      }
    }
    this.lastX = snapshot.x;
    this.lastY = snapshot.y;

    const currentKeys = new Set(snapshot.keysDown);
    for (const vk of Array.from(currentKeys)) {
      if (!this.previousKeysDown.has(vk)) {
        this.keyPressCount += 1;
      }
    }
    this.previousKeysDown = currentKeys;
    this.clickCount += Math.max(0, Math.floor(snapshot.clickCount ?? 0));
    this.scrollCount += Math.max(0, Math.floor(snapshot.scrollCount ?? 0));
  }

  drain(): { mouseMoveCount: number; keyPressCount: number; clickCount: number; scrollCount: number } {
    const result = {
      mouseMoveCount: this.mouseMoveCount,
      keyPressCount: this.keyPressCount,
      clickCount: this.clickCount,
      scrollCount: this.scrollCount
    };
    this.mouseMoveCount = 0;
    this.keyPressCount = 0;
    this.clickCount = 0;
    this.scrollCount = 0;
    return result;
  }
}
