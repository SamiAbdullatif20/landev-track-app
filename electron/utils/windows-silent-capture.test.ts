import { describe, expect, it } from "vitest";
import { resetSilentCaptureGuardForTests, withSilentWindowsCapture } from "./windows-silent-capture";

describe("withSilentWindowsCapture", () => {
  it("runs the capture callback and returns its result", async () => {
    resetSilentCaptureGuardForTests();
    const result = await withSilentWindowsCapture(async () => "ok");
    expect(result).toBe("ok");
  }, 12_000);
});
