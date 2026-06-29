import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queueRoot = path.join(os.tmpdir(), `landev-screenshot-queue-test-${process.pid}`);

type Row = {
  id: number;
  uploadUuid: string;
  filePath: string;
  capturedAt: string;
  projectId: string | null;
  sessionId: string | null;
  metadataJson: string;
  mimeType: string;
  createdAt: string;
  attempts: number;
  nextRunAt: string | null;
  status: "pending" | "retry" | "delivered";
};

function createMockDb(): { db: Database.Database; rows: Row[] } {
  const rows: Row[] = [];
  let nextId = 1;

  const db = {
    prepare: (sql: string) => ({
      run: (params: Record<string, unknown>) => {
        if (sql.includes("INSERT INTO queued_screenshots")) {
          rows.push({
            id: nextId++,
            uploadUuid: String(params.uploadUuid),
            filePath: String(params.filePath),
            capturedAt: String(params.capturedAt),
            projectId: (params.projectId as string | null) ?? null,
            sessionId: (params.sessionId as string | null) ?? null,
            metadataJson: String(params.metadataJson),
            mimeType: String(params.mimeType),
            createdAt: String(params.createdAt),
            attempts: 0,
            nextRunAt: null,
            status: "pending"
          });
        }
        if (sql.includes("UPDATE queued_screenshots") && sql.includes("delivered")) {
          const row = rows.find((entry) => entry.id === params.id);
          if (row) {
            row.status = "delivered";
            row.nextRunAt = null;
          }
        }
        if (sql.includes("UPDATE queued_screenshots") && sql.includes("retry")) {
          const row = rows.find((entry) => entry.id === params.id);
          if (row) {
            row.status = "retry";
            row.attempts = Number(params.attempts);
            row.nextRunAt = String(params.nextRetry);
          }
        }
        if (sql.includes("DELETE FROM queued_screenshots")) {
          const index = rows.findIndex((entry) => entry.id === params.id);
          if (index >= 0) {
            rows.splice(index, 1);
          }
        }
      },
      all: (params?: { now?: string; limit?: number }) => {
        if (sql.includes("SELECT * FROM queued_screenshots")) {
          const now = params?.now ?? new Date().toISOString();
          return rows
            .filter(
              (row) =>
                (row.status === "pending" || row.status === "retry")
                && (row.nextRunAt == null || row.nextRunAt <= now)
            )
            .slice(0, params?.limit ?? rows.length);
        }
        if (sql.includes("SELECT id, filePath FROM queued_screenshots")) {
          return rows.filter((row) => row.status === "pending" || row.status === "retry");
        }
        return rows;
      },
      get: () => {
        if (sql.includes("COUNT(*)")) {
          return {
            total: rows.filter((row) => row.status === "pending" || row.status === "retry").length
          };
        }
        return undefined;
      }
    })
  } as unknown as Database.Database;

  return { db, rows };
}

let mockDb: Database.Database;
let mockRows: Row[];

vi.mock("electron", () => ({
  app: {
    getPath: () => queueRoot
  }
}));

vi.mock("../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("./index", () => ({
  getDb: () => mockDb
}));

import {
  enqueueScreenshot,
  getPendingScreenshotCount,
  getPendingScreenshots,
  markScreenshotDelivered,
  markScreenshotForRetry
} from "./screenshot-queue";

describe("screenshot-queue", () => {
  beforeEach(() => {
    fs.rmSync(queueRoot, { recursive: true, force: true });
    fs.mkdirSync(queueRoot, { recursive: true });
    const created = createMockDb();
    mockDb = created.db;
    mockRows = created.rows;
  });

  afterEach(() => {
    fs.rmSync(queueRoot, { recursive: true, force: true });
  });

  it("writes JPEG to disk and records a pending row", () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const uploadUuid = enqueueScreenshot({
      capturedAt: "2026-06-02T10:00:00.000Z",
      imageBytes: bytes,
      mimeType: "image/jpeg",
      projectId: "proj-1",
      sessionId: "sess-1",
      metadata: { width: 100, height: 50 },
      uploadUuid: "uuid-1"
    });

    expect(uploadUuid).toBe("uuid-1");
    expect(getPendingScreenshotCount()).toBe(1);
    const [row] = getPendingScreenshots();
    expect(row?.filePath).toContain("uuid-1.jpg");
    expect(fs.readFileSync(row!.filePath)).toEqual(bytes);
    expect(JSON.parse(row!.metadataJson).uploadUuid).toBe("uuid-1");
    expect(mockRows).toHaveLength(1);
  });

  it("returns oldest pending screenshots first", () => {
    enqueueScreenshot({
      capturedAt: "2026-06-02T10:00:00.000Z",
      imageBytes: Buffer.from([1]),
      mimeType: "image/jpeg",
      projectId: null,
      uploadUuid: "first"
    });
    enqueueScreenshot({
      capturedAt: "2026-06-02T10:06:00.000Z",
      imageBytes: Buffer.from([2]),
      mimeType: "image/jpeg",
      projectId: null,
      uploadUuid: "second"
    });

    const pending = getPendingScreenshots(10);
    expect(pending.map((row) => row.uploadUuid)).toEqual(["first", "second"]);
  });

  it("deletes file and marks delivered after successful upload", () => {
    const uploadUuid = enqueueScreenshot({
      capturedAt: "2026-06-02T10:00:00.000Z",
      imageBytes: Buffer.from([0xff]),
      mimeType: "image/jpeg",
      projectId: null
    });
    const [row] = getPendingScreenshots();
    expect(row).toBeDefined();

    markScreenshotDelivered(row!.id, row!.filePath);
    expect(getPendingScreenshotCount()).toBe(0);
    expect(fs.existsSync(path.join(queueRoot, `${uploadUuid}.jpg`))).toBe(false);
    expect(mockRows[0]?.status).toBe("delivered");
  });

  it("schedules exponential backoff on retry", () => {
    enqueueScreenshot({
      capturedAt: "2026-06-02T10:00:00.000Z",
      imageBytes: Buffer.from([0xff]),
      mimeType: "image/jpeg",
      projectId: null,
      uploadUuid: "retry-me"
    });
    const [row] = getPendingScreenshots();
    const nextRetryAt = markScreenshotForRetry(row!.id, 3);
    expect(nextRetryAt).toBeTruthy();
    expect(mockRows[0]?.status).toBe("retry");
    expect(mockRows[0]?.attempts).toBe(3);
  });
});
