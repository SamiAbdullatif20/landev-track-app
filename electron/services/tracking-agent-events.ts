import { randomUUID } from "node:crypto";
import { getClientIanaTimeZone } from "../config/client-timezone";
import { enqueueEvent, getSessionState } from "../db/queue-repo";
import { logger } from "../config/logger";
import type { ActivityContext } from "./activity-metadata";
import { buildWorkSessionEventFields } from "./session-event-fields";
import {
  buildTrackingMetadata,
  formatProcessNameForPayload
} from "./tracking-event-utils";
import { isReportableForegroundContext } from "./tracking-app-focus";
import { QUEUE_AGENT_EVENTS_FOR_SYNC } from "./tracking-agent-flags";

/** Event kinds for the lightweight agent — timestamps only; durations computed server-side. */
export const AGENT_EVENT_KINDS = [
  "ACTIVITY_START",
  "ACTIVITY_STOP",
  "APP_CHANGE",
  "IDLE_START",
  "IDLE_END",
  "SCREENSHOT_CAPTURED",
  "HEARTBEAT"
] as const;

export type AgentEventKind = (typeof AGENT_EVENT_KINDS)[number];

type EmitAgentEventInput = {
  kind: AgentEventKind;
  fields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

function emitAgentEvent(input: EmitAgentEventInput): boolean {
  const state = getSessionState();
  if (!state.active && input.kind !== "ACTIVITY_STOP") {
    return false;
  }

  const occurredAtIso = new Date().toISOString();
  const sessionFields = buildWorkSessionEventFields(state, new Date(occurredAtIso));
  const eventUuid = randomUUID();
  const metadata = {
    ...sessionFields,
    clientTimeZone: getClientIanaTimeZone(),
    agentVersion: "event-driven-v1",
    ...(input.metadata ?? {})
  };

  const payload: Record<string, unknown> = {
    eventUuid,
    eventKind: input.kind,
    type: input.kind,
    occurredAt: occurredAtIso,
    occurredAtIso,
    ...sessionFields,
    ...(input.fields ?? {}),
    metadata
  };

  if (QUEUE_AGENT_EVENTS_FOR_SYNC) {
    enqueueEvent(input.kind, payload);
    logger.info("tracking-agent-event", { kind: input.kind, eventUuid, queued: true });
  } else {
    logger.debug("tracking-agent-event-local-only", { kind: input.kind, eventUuid, queued: false });
  }
  return true;
}

export function emitActivityStart(): boolean {
  return emitAgentEvent({
    kind: "ACTIVITY_START",
    metadata: { triggerType: "session_start" }
  });
}

export function emitActivityStop(stopReason?: string): boolean {
  const state = getSessionState();
  const occurredAtIso = new Date().toISOString();
  const sessionFields = buildWorkSessionEventFields(state, new Date(occurredAtIso));
  const eventUuid = randomUUID();
  const payload: Record<string, unknown> = {
    eventUuid,
    eventKind: "ACTIVITY_STOP",
    type: "ACTIVITY_STOP",
    occurredAt: occurredAtIso,
    occurredAtIso,
    ...sessionFields,
    metadata: {
      ...sessionFields,
      clientTimeZone: getClientIanaTimeZone(),
      agentVersion: "event-driven-v1",
      triggerType: "session_stop",
      ...(stopReason ? { stopReason } : {})
    }
  };
  if (QUEUE_AGENT_EVENTS_FOR_SYNC) {
    enqueueEvent("ACTIVITY_STOP", payload);
    logger.info("tracking-agent-event", { kind: "ACTIVITY_STOP", eventUuid, stopReason, queued: true });
  } else {
    logger.debug("tracking-agent-event-local-only", { kind: "ACTIVITY_STOP", eventUuid, stopReason, queued: false });
  }
  return true;
}

export function emitAppChange(context: ActivityContext): boolean {
  if (!isReportableForegroundContext(context)) {
    return false;
  }

  const state = getSessionState();
  const processName = formatProcessNameForPayload(
    context.processName ?? context.appName ?? context.application ?? "",
    context.executablePath
  );
  const built = buildTrackingMetadata({
    source: "event-driven-agent",
    projectId: state.projectId,
    workDescription: state.description,
    trackerElapsedMs: 0,
    rawApplication: context.application ?? context.appName ?? context.processName,
    rawWindowTitle: context.windowTitle ?? context.activeWindowTitle,
    processName,
    application: context.application ?? context.appName,
    windowTitle: context.windowTitle ?? context.activeWindowTitle
  });

  return emitAgentEvent({
    kind: "APP_CHANGE",
    fields: {
      appName: built.metadata.applicationDisplayName,
      application: built.metadata.application,
      applicationDisplayName: built.metadata.applicationDisplayName,
      processName,
      windowTitle: built.metadata.windowTitle
    },
    metadata: {
      ...built.metadata,
      executablePath: context.executablePath ?? null,
      processId: context.processId ?? null,
      triggerType: "foreground_change",
      hasForegroundWindowHandle: Boolean(context.hasForegroundWindowHandle),
      windowReasonCode: context.windowReasonCode ?? null
    }
  });
}

export function emitIdleStart(idleMs: number): boolean {
  return emitAgentEvent({
    kind: "IDLE_START",
    fields: { systemIdleMs: idleMs },
    metadata: { triggerType: "idle_transition" }
  });
}

export function emitIdleEnd(idleMs: number): boolean {
  return emitAgentEvent({
    kind: "IDLE_END",
    fields: { systemIdleMs: idleMs },
    metadata: { triggerType: "idle_transition" }
  });
}

export function emitHeartbeat(context: ActivityContext | null, systemIdleMs: number): boolean {
  const fields: Record<string, unknown> = { systemIdleMs };
  let metadata: Record<string, unknown> = { triggerType: "heartbeat" };

  if (context && isReportableForegroundContext(context)) {
    const processName = formatProcessNameForPayload(
      context.processName ?? context.appName ?? context.application ?? "",
      context.executablePath
    );
    fields.processName = processName;
    fields.windowTitle = context.windowTitle ?? context.activeWindowTitle ?? "";
    fields.application = context.application ?? context.appName ?? processName;
    metadata = {
      ...metadata,
      processName,
      windowTitle: fields.windowTitle,
      application: fields.application
    };
  }

  return emitAgentEvent({ kind: "HEARTBEAT", fields, metadata });
}

export function emitScreenshotCaptured(input: {
  capturedAt: string;
  width: number;
  height: number;
  compressedBytes: number;
  visibility: string;
  intervalMinutes: number;
  screenSourceId?: string;
}): boolean {
  return emitAgentEvent({
    kind: "SCREENSHOT_CAPTURED",
    fields: {
      capturedAt: input.capturedAt,
      width: input.width,
      height: input.height,
      compressedBytes: input.compressedBytes,
      visibility: input.visibility,
      intervalMinutes: input.intervalMinutes,
      screenSourceId: input.screenSourceId ?? null
    },
    metadata: {
      triggerType: "scheduled_capture",
      visibility: input.visibility,
      intervalMinutes: input.intervalMinutes
    }
  });
}
