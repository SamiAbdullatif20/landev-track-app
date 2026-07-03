import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("renderer tracking poll guard", () => {
  it("does not restore the removed useActivityTracker hook", () => {
    expect(fs.existsSync(path.join(root, "src/hooks/useActivityTracker.ts"))).toBe(false);
  });

  it("does not call deprecated trackEvent from App.tsx", () => {
    const appSource = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
    expect(appSource).not.toMatch(/useActivityTracker/);
    expect(appSource).not.toMatch(/trackEvent\s*\(/);
  });
});
