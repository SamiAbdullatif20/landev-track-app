import { describe, expect, it } from "vitest";
import {
  batchEventKindsForSync,
  INPUT_ACTIVITY_BATCH_KINDS,
  isInputActivityBatchKind,
  QUEUE_INPUT_ACTIVITY_FOR_SYNC
} from "./tracking-agent-flags";

describe("tracking-agent-flags", () => {
  it("identifies input activity batch kinds", () => {
    expect(isInputActivityBatchKind("INPUT_ACTIVITY")).toBe(true);
    expect(isInputActivityBatchKind("HEARTBEAT")).toBe(true);
    expect(isInputActivityBatchKind("ACTIVITY_INTERVAL")).toBe(true);
    expect(isInputActivityBatchKind("APP_FOCUS")).toBe(false);
  });

  it("filters input activity kinds from sync when disabled", () => {
    expect(QUEUE_INPUT_ACTIVITY_FOR_SYNC).toBe(false);
    expect(batchEventKindsForSync(INPUT_ACTIVITY_BATCH_KINDS)).toEqual([]);
    expect(batchEventKindsForSync(["APP_FOCUS", "INPUT_ACTIVITY"])).toEqual(["APP_FOCUS"]);
  });
});
