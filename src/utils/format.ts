export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatClock(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function primaryRoleLabel(roles: string[]): string {
  if (roles.some((role) => /super.?admin/i.test(role))) return "Super Admin";
  if (roles.some((role) => /moderator/i.test(role))) return "Moderator";
  if (roles.some((role) => /designer/i.test(role))) return "Designer";
  return roles[0] ?? "Employee";
}
