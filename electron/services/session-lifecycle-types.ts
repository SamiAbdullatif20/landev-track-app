import type { SessionStopResult } from "../api/client";

export type StopActiveSessionFn = (stoppedAt: string) => Promise<SessionStopResult>;
