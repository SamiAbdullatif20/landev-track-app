import { getClientIanaTimeZone } from "../config/client-timezone";

export const ACTIVITY_INTERVAL_MINUTES = 15;
export const ACTIVITY_INTERVAL_MS = ACTIVITY_INTERVAL_MINUTES * 60 * 1000;

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function readPart(parts: Intl.DateTimeFormatPart[], type: string): number {
  return Number(parts.find((part) => part.type === type)?.value ?? 0);
}

export function localDateTimeParts(atMs: number, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(atMs));

  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: readPart(parts, "hour"),
    minute: readPart(parts, "minute"),
    second: readPart(parts, "second")
  };
}

function partsKey(parts: LocalParts, minuteOverride?: number): string {
  const minute = minuteOverride ?? parts.minute;
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
    String(parts.hour).padStart(2, "0"),
    String(minute).padStart(2, "0")
  ].join("-");
}

/** Wall-clock 15-minute block start in the employee's local timezone. */
export function floorToFifteenMinuteIntervalStartMs(
  atMs: number,
  timeZone = getClientIanaTimeZone()
): number {
  const parts = localDateTimeParts(atMs, timeZone);
  const flooredMinute = Math.floor(parts.minute / ACTIVITY_INTERVAL_MINUTES) * ACTIVITY_INTERVAL_MINUTES;
  const targetKey = partsKey(parts, flooredMinute);

  let low = atMs - ACTIVITY_INTERVAL_MS;
  let high = atMs;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midParts = localDateTimeParts(mid, timeZone);
    const midKey = partsKey(midParts, Math.floor(midParts.minute / ACTIVITY_INTERVAL_MINUTES) * ACTIVITY_INTERVAL_MINUTES);
    if (midKey < targetKey) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export function intervalEndMs(intervalStartMs: number): number {
  return intervalStartMs + ACTIVITY_INTERVAL_MS;
}
