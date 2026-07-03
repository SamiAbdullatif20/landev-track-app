import { getDb, type QueuedEvent, type SessionState } from "./index";
import { randomUUID } from "node:crypto";
import { hasUsableWorkSessionId } from "../services/session-event-fields";

export function enqueueEvent(eventType: string, payload: unknown): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO queued_events (eventUuid, eventKind, payloadJson, createdAt, status)
    VALUES (@eventUuid, @eventKind, @payloadJson, @createdAt, 'pending')
  `);

  stmt.run({
    eventUuid: randomUUID(),
    eventKind: eventType,
    payloadJson: JSON.stringify(payload),
    createdAt: new Date().toISOString()
  });
}

export function getPendingEvents(limit = 50): QueuedEvent[] {
  return getPendingEventsByKinds(null, limit);
}

export function getPendingEventsByKinds(kinds: readonly string[] | null, limit = 50): QueuedEvent[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM queued_events
    WHERE status IN ('pending', 'retry')
      AND (nextRunAt IS NULL OR nextRunAt <= @now)
    ORDER BY id ASC
    LIMIT @fetchLimit
  `);
  const fetchLimit = kinds && kinds.length > 0 ? Math.max(limit * 4, limit) : limit;
  const rows = stmt.all({
    now: new Date().toISOString(),
    fetchLimit
  }) as QueuedEvent[];
  if (!kinds || kinds.length === 0) {
    return rows.slice(0, limit);
  }
  const allowed = new Set(kinds);
  return rows.filter((row) => allowed.has(row.eventKind)).slice(0, limit);
}

export function markEventsDelivered(ids: number[]): void {
  if (ids.length === 0) {
    return;
  }
  const db = getDb();
  const placeholders = ids.map(() => "?").join(", ");
  db.prepare(`
    UPDATE queued_events
    SET status = 'delivered', nextRunAt = NULL
    WHERE id IN (${placeholders})
  `).run(...ids);
}

export function markEventDelivered(id: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE queued_events
    SET status = 'delivered', nextRunAt = NULL
    WHERE id = @id
  `).run({ id });
}

export function markEventForRetry(id: number, attempts: number): string {
  const db = getDb();
  const retryMs = Math.min(5 * 60_000, 2 ** attempts * 1000);
  const nextRetry = new Date(Date.now() + retryMs).toISOString();
  db.prepare(`
    UPDATE queued_events
    SET status = 'retry', attempts = @attempts, nextRunAt = @nextRetry
    WHERE id = @id
  `).run({ id, attempts, nextRetry });
  return nextRetry;
}

/** Attach work session id to events queued before remote /start returned. */
export function backfillWorkSessionIdOnPendingEvents(workSessionId: string, limit = 500): number {
  if (!hasUsableWorkSessionId(workSessionId)) {
    return 0;
  }
  const db = getDb();
  const events = db
    .prepare(
      `SELECT * FROM queued_events
       WHERE status IN ('pending', 'retry')
       ORDER BY id ASC
       LIMIT @limit`
    )
    .all({ limit }) as QueuedEvent[];

  let updated = 0;
  const stmt = db.prepare(
    `UPDATE queued_events SET payloadJson = @payloadJson WHERE id = @id`
  );

  for (const event of events) {
    try {
      const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
      if (hasUsableWorkSessionId(payload.sessionId as string | undefined)) {
        continue;
      }
      if (hasUsableWorkSessionId(payload.workSessionId as string | undefined)) {
        continue;
      }
      const metadata =
        payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
          ? { ...(payload.metadata as Record<string, unknown>) }
          : {};
      const nextPayload: Record<string, unknown> = {
        ...payload,
        sessionId: workSessionId,
        workSessionId,
        metadata: {
          ...metadata,
          sessionId: workSessionId,
          workSessionId
        }
      };
      stmt.run({ id: event.id, payloadJson: JSON.stringify(nextPayload) });
      updated += 1;
    } catch {
      // Skip malformed rows.
    }
  }

  return updated;
}

export function getPendingCount(): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as total FROM queued_events WHERE status IN ('pending', 'retry')")
    .get() as { total: number };
  return row.total;
}

function isSyntheticSessionId(value: unknown): boolean {
  return typeof value === "string" && /^\d{13,}$/.test(value.trim());
}

export function clearSyntheticSessionPendingEvents(limit = 5000): number {
  const db = getDb();
  const events = db.prepare(`
    SELECT * FROM queued_events
    WHERE status IN ('pending', 'retry')
    ORDER BY id ASC
    LIMIT @limit
  `).all({ limit }) as QueuedEvent[];
  let cleared = 0;
  for (const event of events) {
    try {
      const payload = JSON.parse(event.payloadJson) as Record<string, unknown>;
      if (isSyntheticSessionId(payload.sessionId)) {
        markEventDelivered(event.id);
        cleared += 1;
      }
    } catch {
      // Ignore malformed payload rows.
    }
  }
  return cleared;
}

export function getSessionState(): SessionState {
  const db = getDb();
  return db.prepare("SELECT * FROM active_session WHERE id = 1").get() as SessionState;
}

export function clearUndeliveredQueuedEvents(): number {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM queued_events WHERE status IN ('pending', 'retry')")
    .run();
  return result.changes;
}

export function resetActiveSessionState(): void {
  saveSessionState({
    active: 0,
    sessionId: null,
    projectId: null,
    description: null,
    startedAt: null
  });
}

export function saveSessionState(state: Omit<SessionState, "id" | "updatedAt">): void {
  const db = getDb();
  db.prepare(`
    UPDATE active_session
    SET active = @active,
        sessionId = @sessionId,
        projectId = @projectId,
        description = @description,
        startedAt = @startedAt,
        updatedAt = @updatedAt
    WHERE id = 1
  `).run({
    active: state.active,
    sessionId: state.sessionId,
    projectId: state.projectId,
    description: state.description,
    startedAt: state.startedAt,
    updatedAt: new Date().toISOString()
  });
}

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = @key").get({ key }) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO app_settings (key, value, updatedAt)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run({ key, value, updatedAt: new Date().toISOString() });
}
