import { describe, expect, it } from "vitest";
import { isActiveSessionStartConflictError } from "./session-start-reconcile";
import { ApiError } from "../api/client";

describe("isActiveSessionStartConflictError", () => {
  it("detects another-project-in-progress validation from the server", () => {
    const error = new ApiError(
      "validation",
      "Work session already in progress for another project today."
    );
    expect(isActiveSessionStartConflictError(error)).toBe(true);
  });

  it("detects server validation text from the screenshot", () => {
    const error = new ApiError(
      "validation",
      "Work session already started with a different start time today."
    );
    expect(isActiveSessionStartConflictError(error)).toBe(true);
  });

  it("ignores unrelated validation errors", () => {
    const error = new ApiError("validation", "Description is required.");
    expect(isActiveSessionStartConflictError(error)).toBe(false);
  });

  it("detects wrapped handler errors", () => {
    const error = new Error(
      "VALIDATION: Work session already started with a different start time today."
    );
    expect(isActiveSessionStartConflictError(error)).toBe(true);
  });
});
