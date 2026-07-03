export type RemoteSessionStatus = {
  active: boolean;
  sessionId: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  source: string | null;
};

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/** Parse active session payload from web tracking/status endpoints. */
export function parseRemoteSessionStatus(data: unknown): RemoteSessionStatus | null {
  const root = asRecord(data);
  if (!root) {
    return null;
  }

  const nested =
    asRecord(root.workSession)
    ?? asRecord(root.session)
    ?? asRecord(root.activeSession)
    ?? asRecord(root.data)
    ?? root;

  const sessionId = readString(nested, [
    "workSessionId",
    "sessionId",
    "id",
    "work_session_id",
    "session_id"
  ]);

  const startedAt = readString(nested, [
    "startedAt",
    "startTime",
    "startTimeUtc",
    "start_time",
    "clockInAt",
    "clock_in_at"
  ]);
  const stoppedAt = readString(nested, [
    "stoppedAt",
    "stopTime",
    "stopTimeUtc",
    "endTime",
    "stop_time",
    "clockOutAt",
    "clock_out_at"
  ]);

  const statusText = readString(root, ["status", "state"]) ?? readString(nested, ["status", "state"]);
  const activeFlag = root.active ?? root.isActive ?? nested.active ?? nested.isActive;

  let active = false;
  if (typeof activeFlag === "boolean") {
    active = activeFlag;
  } else if (statusText) {
    const normalized = statusText.toLowerCase();
    active = normalized === "active" || normalized === "running" || normalized === "started";
  } else if (sessionId && startedAt && !stoppedAt) {
    active = true;
  }

  if (!active && !sessionId && !startedAt) {
    return { active: false, sessionId: null, projectId: null, projectName: null, description: null, startedAt: null, stoppedAt: null, source: null };
  }

  return {
    active,
    sessionId,
    projectId: readString(nested, ["projectId", "project_id"]),
    projectName: readString(nested, ["projectName", "project_name", "name"]),
    description: readString(nested, ["description", "workDetails", "work_details", "details"]),
    startedAt,
    stoppedAt,
    source: readString(root, ["source", "startedBy", "client", "origin"])
  };
}

/** True when the server payload describes a session that has not been stopped yet. */
export function isOpenRemoteWorkSession(status: RemoteSessionStatus): boolean {
  if (status.active) {
    return true;
  }
  return Boolean(status.sessionId && status.startedAt && !status.stoppedAt);
}
