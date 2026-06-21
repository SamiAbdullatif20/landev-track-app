export function toFriendlyMessage(raw: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  if (!(raw instanceof Error) || !raw.message) {
    return fallback;
  }

  if (raw.message.startsWith("NETWORK:")) {
    return "Network error. Please check your connection.";
  }

  if (raw.message.startsWith("AUTH:")) {
    const detail = raw.message.replace("AUTH:", "").trim();
    return detail || "Invalid username or password.";
  }

  if (raw.message.startsWith("VALIDATION:")) {
    return raw.message.replace("VALIDATION:", "").trim();
  }

  if (raw.message.startsWith("SERVER:")) {
    return raw.message.replace("SERVER:", "").trim() || "Server error. Please retry.";
  }

  return raw.message;
}
