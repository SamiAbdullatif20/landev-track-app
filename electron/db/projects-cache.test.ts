import { describe, expect, it } from "vitest";
import { compareProjectIdSets } from "./projects-cache";

describe("compareProjectIdSets", () => {
  it("detects added and removed ids", () => {
    const result = compareProjectIdSets(["a", "b"], ["b", "c"]);
    expect(result.idsChanged).toBe(true);
    expect(result.removedIds).toEqual(["a"]);
    expect(result.addedIds).toEqual(["c"]);
  });

  it("reports unchanged when id sets match", () => {
    const result = compareProjectIdSets(["a", "b"], ["b", "a"]);
    expect(result.idsChanged).toBe(false);
    expect(result.addedIds).toEqual([]);
    expect(result.removedIds).toEqual([]);
  });
});
