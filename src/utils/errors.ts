export function toFriendlyMessage(raw: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  if (!(raw instanceof Error) || !raw.message) {
    return fallback;
  }

  if (raw.message.startsWith("NETWORK:")) {
    return "Network error. Please check your connection.";
  }

  if (raw.message.startsWith("AUTH:")) {
    return "Authentication issue. Please log in again.";
  }

  if (raw.message.startsWith("VALIDATION:")) {
    return raw.message.replace("VALIDATION:", "").trim();
  }

  if (raw.message.startsWith("SERVER:")) {
    return raw.message.replace("SERVER:", "").trim() || "Server error. Please retry.";
  }

  return raw.message;
}
