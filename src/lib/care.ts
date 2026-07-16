import type { CareType } from "./types";

export const CARE_TYPES: { value: CareType; label: string; emoji: string }[] = [
  { value: "vaccination", label: "Vaccination", emoji: "💉" },
  { value: "flea_worm", label: "Flea & worm", emoji: "💧" },
  { value: "dental", label: "Dental", emoji: "🦷" },
  { value: "vet_visit", label: "Vet visit", emoji: "🩺" },
  { value: "medication", label: "Medication", emoji: "💊" },
  { value: "grooming", label: "Grooming", emoji: "✂️" },
  { value: "other", label: "Other", emoji: "📌" },
];

export function careType(value: string): { value: CareType; label: string; emoji: string } {
  return CARE_TYPES.find((t) => t.value === value) ?? CARE_TYPES[CARE_TYPES.length - 1];
}

/** One-tap starting points for new schedules. */
export const SCHEDULE_PRESETS: { title: string; type: CareType; intervalDays: number }[] = [
  { title: "Vaccination booster", type: "vaccination", intervalDays: 182 },
  { title: "Flea & worm treatment", type: "flea_worm", intervalDays: 30 },
  { title: "Dental check", type: "dental", intervalDays: 365 },
  { title: "Annual check-up", type: "vet_visit", intervalDays: 365 },
];

export const INTERVAL_OPTIONS: { label: string; days: number | null }[] = [
  { label: "One-off (doesn't repeat)", days: null },
  { label: "Every week", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Every month", days: 30 },
  { label: "Every 2 months", days: 61 },
  { label: "Every 3 months", days: 91 },
  { label: "Every 6 months", days: 182 },
  { label: "Every year", days: 365 },
];

export function intervalLabel(days: number | null): string {
  const match = INTERVAL_OPTIONS.find((o) => o.days === days);
  if (match) return match.days === null ? "One-off" : match.label.replace("Every", "Repeats every");
  return days ? `Repeats every ${days} days` : "One-off";
}

export interface DueStatus {
  days: number; // negative = overdue
  label: string;
  tone: "overdue" | "today" | "soon" | "later";
}

export function dueStatus(nextDue: string, now: Date = new Date()): DueStatus {
  const due = new Date(`${nextDue}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { days, label: `${-days} day${days === -1 ? "" : "s"} overdue`, tone: "overdue" };
  if (days === 0) return { days, label: "Due today", tone: "today" };
  if (days === 1) return { days, label: "Due tomorrow", tone: "soon" };
  if (days <= 14) return { days, label: `Due in ${days} days`, tone: "soon" };
  return {
    days,
    label: `Due ${due.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(due.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) })}`,
    tone: "later",
  };
}

export function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sexLabel(sex: string, neutered: boolean): string | null {
  if (sex === "male") return neutered ? "♂ Male, neutered" : "♂ Male";
  if (sex === "female") return neutered ? "♀ Female, spayed" : "♀ Female";
  return neutered ? "Neutered/spayed" : null;
}
