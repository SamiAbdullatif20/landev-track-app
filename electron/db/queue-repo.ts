import { getDb, type QueuedEvent, type SessionState } from "./index";
import { randomUUID } from "node:crypto";

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
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM queued_events
    WHERE status IN ('pending', 'retry')
      AND (nextRunAt IS NULL OR nextRunAt <= @now)
    ORDER BY id ASC
    LIMIT @limit
  `);

  return stmt.all({ now: new Date().toISOString(), limit }) as QueuedEvent[];
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
  const events = getPendingEvents(limit);
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
