import { describe, expect, it } from "vitest";
import { toFriendlyMessage } from "./errors";

describe("toFriendlyMessage", () => {
  it("maps auth login failures to a clear message", () => {
    expect(toFriendlyMessage(new Error("AUTH: Invalid credentials"))).toBe(
      "Incorrect username or password."
    );
    expect(toFriendlyMessage(new Error("AUTH: Unauthorized"))).toBe(
      "Incorrect username or password."
    );
  });

  it("unwraps Electron IPC errors", () => {
    const ipcError = new Error(
      "Error invoking remote method 'tracking:start': Error: VALIDATION: Work session already in progress for another project today."
    );
    expect(toFriendlyMessage(ipcError)).toBe(
      "You already have an open work session for another project today. Stop that session first, then try again."
    );
  });

  it("maps session conflict and local validation errors", () => {
    expect(
      toFriendlyMessage(
        new Error("VALIDATION: Work session already started with a different start time today.")
      )
    ).toBe(
      "You already started a work session today with a different start time. Stop the open session and try again."
    );
    expect(toFriendlyMessage(new Error("VALIDATION: Session already running."))).toBe(
      "A tracking session is already running in this app."
    );
    expect(toFriendlyMessage(new Error("VALIDATION: Accept tracking terms before starting."))).toBe(
      "Please accept the tracking terms before starting work."
    );
  });

  it("maps network and server errors", () => {
    expect(toFriendlyMessage(new Error("NETWORK: Network unavailable. Check your connection and retry."))).toBe(
      "Cannot reach the server. Check your internet connection and try again."
    );
    expect(toFriendlyMessage(new Error("SERVER: Request failed with status 500."))).toBe(
      "The server is temporarily unavailable. Please try again in a few minutes."
    );
  });

  it("maps login form validation messages", () => {
    expect(toFriendlyMessage(new Error("VALIDATION: String must contain at least 3 character(s)"))).toBe(
      "Username must be at least 3 characters."
    );
    expect(toFriendlyMessage(new Error("VALIDATION: String must contain at least 6 character(s)"))).toBe(
      "Password must be at least 6 characters."
    );
  });
});
