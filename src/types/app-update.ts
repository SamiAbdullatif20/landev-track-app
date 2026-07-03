export type AppUpdateStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available"; version: string; currentVersion: string }
  | {
      phase: "downloading";
      percent: number;
      version: string;
      transferred: number;
      total: number;
      bytesPerSecond: number;
    }
  | { phase: "ready"; version: string }
  | { phase: "error"; message: string; version: string | null };
