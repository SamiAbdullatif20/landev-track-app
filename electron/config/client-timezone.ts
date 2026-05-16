let cached: { zone: string; cachedAtMs: number } | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * IANA time zone for the OS session (e.g. "Pacific/Auckland", "Europe/Istanbul").
 * Cached briefly; refreshes if the process runs across a rare TZ change.
 */
export function getClientIanaTimeZone(): string {
  const now = Date.now();
  if (cached && now - cached.cachedAtMs < CACHE_TTL_MS) {
    return cached.zone;
  }
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    const resolved = zone && zone.length > 0 ? zone : "UTC";
    cached = { zone: resolved, cachedAtMs: now };
    return resolved;
  } catch {
    cached = { zone: "UTC", cachedAtMs: now };
    return "UTC";
  }
}
