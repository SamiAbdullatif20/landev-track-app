import { getClientIanaTimeZone } from "../config/client-timezone";

/** Local work date for the employee (YYYY-MM-DD in client IANA zone). */
export function getWorkDateKey(at: Date = new Date()): string {
  return formatWorkDateKeyAt(at.getTime(), getClientIanaTimeZone());
}

export function formatWorkDateKeyAt(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(ms));
}

export function nextWorkDateKey(workDateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(workDateKey);
  if (!match) {
    throw new Error(`Invalid workDateKey: ${workDateKey}`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  const day = String(next.getUTCDate()).padStart(2, "0");
  return `${next.getUTCFullYear()}-${month}-${day}`;
}

function localTimeParts(ms: number, timeZone: string): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(ms));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    hour: read("hour"),
    minute: read("minute"),
    second: read("second")
  };
}

/** UTC ms for local midnight at the start of workDateKey in timeZone. */
export function resolveWorkDayStartMs(workDateKey: string, timeZone: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(workDateKey);
  if (!match) {
    throw new Error(`Invalid workDateKey: ${workDateKey}`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const anchor = Date.UTC(y, m - 1, d, 12, 0, 0);

  let low = anchor - 36 * 3_600_000;
  let high = anchor + 36 * 3_600_000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const key = formatWorkDateKeyAt(mid, timeZone);
    if (key < workDateKey) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  let start = low;
  while (start > low - 86_400_000) {
    if (formatWorkDateKeyAt(start, timeZone) !== workDateKey) {
      break;
    }
    const parts = localTimeParts(start, timeZone);
    if (parts.hour === 0 && parts.minute === 0 && parts.second === 0) {
      return start;
    }
    start -= 1_000;
  }

  return low;
}

/** Milliseconds of [rangeStartIso, rangeEndIso) that fall on workDateKey in timeZone. */
export function getWorkDayOverlapMs(
  rangeStartIso: string,
  rangeEndIso: string,
  workDateKey: string,
  timeZone?: string
): number {
  const zone = timeZone ?? getClientIanaTimeZone();
  const startMs = Date.parse(rangeStartIso);
  const endMs = Date.parse(rangeEndIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  const dayStartMs = resolveWorkDayStartMs(workDateKey, zone);
  const dayEndMs = resolveWorkDayStartMs(nextWorkDateKey(workDateKey), zone);
  const overlapStart = Math.max(startMs, dayStartMs);
  const overlapEnd = Math.min(endMs, dayEndMs);
  return Math.max(0, overlapEnd - overlapStart);
}
