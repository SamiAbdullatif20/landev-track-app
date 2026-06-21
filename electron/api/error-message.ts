/**
 * Turn API / validation error payloads into user-readable text.
 */
export function formatUnknownErrorMessage(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = formatUnknownErrorMessage(item);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "description", "msg", "reason"] as const) {
      const message = formatUnknownErrorMessage(record[key]);
      if (message) {
        return message;
      }
    }

    for (const key of ["errors", "issues", "details"] as const) {
      const message = formatUnknownErrorMessage(record[key]);
      if (message) {
        return message;
      }
    }

    for (const key of ["code", "type", "name"] as const) {
      const message = formatUnknownErrorMessage(record[key]);
      if (message) {
        return message;
      }
    }
  }

  return null;
}

export function formatAxiosErrorBody(data: unknown, status: number): string {
  const fromPayload = formatUnknownErrorMessage(data);
  if (fromPayload) {
    return fromPayload;
  }

  if (status === 401 || status === 403) {
    return "Invalid username or password.";
  }

  if (status === 402) {
    return "The tracking server is temporarily unavailable. Please contact your admin.";
  }

  if (status === 404) {
    return "Login service not found. Please contact your admin.";
  }

  if (status >= 500) {
    return "Server is currently unavailable. Try again shortly.";
  }

  return `Request failed with status ${status}.`;
}
