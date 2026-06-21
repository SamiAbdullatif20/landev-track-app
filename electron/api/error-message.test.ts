import { describe, expect, it } from "vitest";
import { formatAxiosErrorBody, formatUnknownErrorMessage } from "./error-message";

describe("formatUnknownErrorMessage", () => {
  it("reads nested API error objects", () => {
    expect(formatUnknownErrorMessage({ error: { message: "Invalid credentials" } })).toBe(
      "Invalid credentials"
    );
  });

  it("reads validation issue arrays", () => {
    expect(formatUnknownErrorMessage({ errors: [{ message: "Password is required" }] })).toBe(
      "Password is required"
    );
  });

  it("returns null for empty payloads", () => {
    expect(formatUnknownErrorMessage({})).toBeNull();
  });
});

describe("formatAxiosErrorBody", () => {
  it("maps auth failures to a friendly message", () => {
    expect(formatAxiosErrorBody({ error: "Unauthorized" }, 401)).toBe("Unauthorized");
    expect(formatAxiosErrorBody({}, 401)).toBe("Invalid username or password.");
  });
});
