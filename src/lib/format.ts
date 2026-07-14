const DAY_MS = 24 * 60 * 60 * 1000;

export function fmtWeight(grams: number): string {
  const rounded = Math.round(grams * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} g`;
}

export function fmtSigned(grams: number): string {
  const rounded = Math.round(grams * 10) / 10;
  const s = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  return `${rounded >= 0 ? "+" : "−"}${s}`;
}

export function fmtRate(gramsPerDay: number): string {
  return `${fmtSigned(gramsPerDay)} g/day`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function fmtDateShort(d: Date | number): string {
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function fmtDateTime(d: Date | number): string {
  const date = new Date(d);
  return `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export function fmtDayHeading(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(date)) / DAY_MS);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

export function fmtAge(birthDate: string | null, at: Date = new Date()): string | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  const days = Math.floor((at.getTime() - birth.getTime()) / DAY_MS);
  if (days < 0) return null;
  if (days < 14) return `${days}d old`;
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  return rem ? `${weeks}w ${rem}d old` : `${weeks}w old`;
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function daysBetween(aIso: string, bIso: string): number {
  return Math.abs(new Date(bIso).getTime() - new Date(aIso).getTime()) / DAY_MS;
}

/** Formats a Date for <input type="datetime-local"> in local time. */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
