export type TrackingDebugEvent = {
  capturedAt: string;
  eventId: string;
  eventType: string;
  rawApplication: string;
  rawWindowTitle: string;
  processName: string;
  application: string;
  hasWindowTitle: boolean;
  hasForegroundWindowHandle: boolean;
  source: string;
  windowReasonCode: string | null;
};

export type TrackingDiagnosticsSnapshot = {
  counters: {
    totalCaptured: number;
    totalSynced: number;
    missingWindowTitleCount: number;
    fallbackAppNameCount: number;
    normalizedAppNameCount: number;
  };
  lastSync: {
    ok: boolean;
    statusCode: number | null;
    message: string;
    at: string | null;
  };
  events: TrackingDebugEvent[];
};

const MAX_EVENTS = 80;

class TrackingDiagnosticsStore {
  private events: TrackingDebugEvent[] = [];

  private counters = {
    totalCaptured: 0,
    totalSynced: 0,
    missingWindowTitleCount: 0,
    fallbackAppNameCount: 0,
    normalizedAppNameCount: 0
  };

  private lastSync = {
    ok: false,
    statusCode: null as number | null,
    message: "",
    at: null as string | null
  };

  public recordCaptured(event: TrackingDebugEvent, flags: { missingWindowTitle: boolean; fallbackAppName: boolean; normalizedAppName: boolean }): void {
    this.counters.totalCaptured += 1;
    if (flags.missingWindowTitle) this.counters.missingWindowTitleCount += 1;
    if (flags.fallbackAppName) this.counters.fallbackAppNameCount += 1;
    if (flags.normalizedAppName) this.counters.normalizedAppNameCount += 1;
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }
  }

  public recordSync(ok: boolean, statusCode: number | null, message: string): void {
    if (ok) {
      this.counters.totalSynced += 1;
    }
    this.lastSync = { ok, statusCode, message, at: new Date().toISOString() };
  }

  public snapshot(lastN = 200): TrackingDiagnosticsSnapshot {
    return {
      counters: { ...this.counters },
      lastSync: { ...this.lastSync },
      events: this.events.slice(-Math.max(1, Math.min(lastN, MAX_EVENTS)))
    };
  }
}

export const trackingDiagnostics = new TrackingDiagnosticsStore();
