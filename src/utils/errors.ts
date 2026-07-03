type ParsedError = {
  kind: "auth" | "validation" | "server" | "network" | null;
  detail: string;
};

const IPC_ERROR_PREFIX =
  /^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/i;

const AUTH_LOGIN_FAILURE =
  /invalid\s+(username|password|credentials)|incorrect\s+(username|password)|unauthorized|forbidden|login did not return|check your username and password|authentication failed|bad credentials/i;

const AUTH_SESSION_EXPIRED =
  /not authenticated|session expired|token expired|please sign in|log in again/i;

const SESSION_CONFLICT_ANOTHER_PROJECT =
  /work session already in progress for another project|another project today/i;

const SESSION_CONFLICT_START_TIME =
  /work session already started with a different start time|already started with a different start time today/i;

const SESSION_ALREADY_RUNNING =
  /session already running|session already (active|started)|active work session/i;

function extractRawMessage(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  if (raw instanceof Error && raw.message.trim()) {
    return raw.message.trim();
  }
  return null;
}

function unwrapIpcError(message: string): string {
  return message.replace(IPC_ERROR_PREFIX, "").trim();
}

function parsePrefixedError(message: string): ParsedError {
  const unwrapped = unwrapIpcError(message);
  const match = /^(AUTH|VALIDATION|SERVER|NETWORK):\s*(.*)$/is.exec(unwrapped);
  if (!match) {
    return { kind: null, detail: unwrapped };
  }

  const kind = match[1].toLowerCase() as ParsedError["kind"];
  return { kind, detail: match[2].trim() };
}

function humanizeAuthDetail(detail: string): string {
  if (!detail) {
    return "Incorrect username or password.";
  }
  if (AUTH_SESSION_EXPIRED.test(detail)) {
    return "Your session has expired. Please sign in again.";
  }
  if (AUTH_LOGIN_FAILURE.test(detail)) {
    return "Incorrect username or password.";
  }
  return "Incorrect username or password.";
}

function humanizeValidationDetail(detail: string): string {
  if (!detail) {
    return "Please check your entries and try again.";
  }

  const normalized = detail.toLowerCase();

  if (SESSION_CONFLICT_ANOTHER_PROJECT.test(detail)) {
    return "You already have an open work session for another project today. Stop that session first, then try again.";
  }
  if (SESSION_CONFLICT_START_TIME.test(detail)) {
    return "You already started a work session today with a different start time. Stop the open session and try again.";
  }
  if (SESSION_ALREADY_RUNNING.test(detail)) {
    return "A tracking session is already running in this app.";
  }
  if (/accept tracking terms/i.test(detail)) {
    return "Please accept the tracking terms before starting work.";
  }
  if (/no active session to stop/i.test(detail)) {
    return "There is no active session to stop.";
  }
  if (/description is required|too small.*description|at least 3 character/i.test(detail)) {
    if (normalized.includes("description")) {
      return "Please enter a short description of your work (at least 3 characters).";
    }
  }
  if (/select a project before starting/i.test(detail)) {
    return "Select a project before starting work.";
  }
  if (/select an admin task type/i.test(detail)) {
    return "Select an admin task type before starting.";
  }
  if (/string must contain at least 3 character/i.test(detail)) {
    return "Username must be at least 3 characters.";
  }
  if (/string must contain at least 6 character/i.test(detail)) {
    return "Password must be at least 6 characters.";
  }
  if (/invalid request/i.test(detail)) {
    return "Please check your entries and try again.";
  }

  return detail;
}

function humanizeServerDetail(detail: string): string {
  if (!detail) {
    return "Something went wrong on the server. Please try again.";
  }

  const normalized = detail.toLowerCase();

  if (AUTH_LOGIN_FAILURE.test(detail) || normalized.includes("invalid username or password")) {
    return "Incorrect username or password.";
  }
  if (/network unavailable|network error|econnreset|etimedout|enotfound|failed to fetch/i.test(detail)) {
    return "Cannot reach the server. Check your internet connection and try again.";
  }
  if (/server is currently unavailable|temporarily unavailable|status 5\d\d/i.test(detail)) {
    return "The server is temporarily unavailable. Please try again in a few minutes.";
  }
  if (/login service not found|status 404/i.test(detail)) {
    return "Could not reach the login service. Please contact your administrator.";
  }
  if (/request failed with status 401|request failed with status 403/i.test(detail)) {
    return "Incorrect username or password.";
  }
  if (/request failed with status 402/i.test(detail)) {
    return "The tracking service is temporarily unavailable. Please contact your administrator.";
  }
  if (/request failed with status 429/i.test(detail)) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (/unexpected failure|unexpected error/i.test(detail)) {
    return "Something went wrong. Please try again.";
  }
  if (IPC_ERROR_PREFIX.test(detail)) {
    return "Something went wrong. Please try again.";
  }

  return detail;
}

function humanizeNetworkDetail(detail: string): string {
  if (!detail || /network unavailable|check your connection/i.test(detail)) {
    return "Cannot reach the server. Check your internet connection and try again.";
  }
  return "Cannot reach the server. Check your internet connection and try again.";
}

function humanizeParsedError(parsed: ParsedError): string {
  switch (parsed.kind) {
    case "auth":
      return humanizeAuthDetail(parsed.detail);
    case "validation":
      return humanizeValidationDetail(parsed.detail);
    case "server":
      return humanizeServerDetail(parsed.detail);
    case "network":
      return humanizeNetworkDetail(parsed.detail);
    default:
      return humanizeServerDetail(parsed.detail);
  }
}

export function toFriendlyMessage(raw: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  const message = extractRawMessage(raw);
  if (!message) {
    return fallback;
  }

  const parsed = parsePrefixedError(message);
  if (parsed.kind) {
    return humanizeParsedError(parsed);
  }

  if (AUTH_LOGIN_FAILURE.test(message) || AUTH_SESSION_EXPIRED.test(message)) {
    return humanizeAuthDetail(message);
  }
  if (SESSION_CONFLICT_ANOTHER_PROJECT.test(message) || SESSION_CONFLICT_START_TIME.test(message)) {
    return humanizeValidationDetail(message);
  }

  return humanizeServerDetail(unwrapIpcError(message));
}
