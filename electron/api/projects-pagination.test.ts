import { describe, expect, it } from "vitest";
import { parseProjectsNextCursor } from "./client";

describe("parseProjectsNextCursor", () => {
  it("reads pagination.nextCursor", () => {
    expect(
      parseProjectsNextCursor({
        projects: [],
        pagination: { nextCursor: "abc123" }
      })
    ).toBe("abc123");
  });

  it("reads root nextCursor", () => {
    expect(parseProjectsNextCursor({ projects: [], nextCursor: "page2" })).toBe("page2");
  });

  it("returns null when pagination is missing", () => {
    expect(parseProjectsNextCursor({ projects: [] })).toBeNull();
    expect(parseProjectsNextCursor([])).toBeNull();
  });

  it("returns null when hasMore is false", () => {
    expect(
      parseProjectsNextCursor({
        projects: [],
        pagination: { hasMore: false, nextCursor: "ignored" }
      })
    ).toBeNull();
  });
});
