import { describe, expect, it } from "vitest";
import { getClientIanaTimeZone } from "./client-timezone";

describe("getClientIanaTimeZone", () => {
  it("returns a non-empty IANA-like string", () => {
    const zone = getClientIanaTimeZone();
    expect(typeof zone).toBe("string");
    expect(zone.length).toBeGreaterThan(0);
  });
});
