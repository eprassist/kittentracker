import type { Kitten, WeighIn } from "./types";

function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Builds a CSV of all weigh-ins (oldest first, per kitten) with per-entry
 * deltas, and triggers a download. BOM included so Excel opens it cleanly.
 */
export function downloadCsv(kittens: Kitten[], weighIns: WeighIn[]): void {
  const byId = new Map(kittens.map((k) => [k.id, k]));
  const asc = [...weighIns].sort(
    (a, b) => a.kitten_id.localeCompare(b.kitten_id) || a.weighed_at.localeCompare(b.weighed_at),
  );

  const rows: string[][] = [["Kitten", "Date", "Time", "Weight (g)", "Change (g)", "Logged by", "Notes"]];
  const lastWeight = new Map<string, number>();
  for (const w of asc) {
    const kitten = byId.get(w.kitten_id);
    if (!kitten) continue;
    const prev = lastWeight.get(w.kitten_id);
    const d = new Date(w.weighed_at);
    rows.push([
      kitten.name,
      d.toLocaleDateString(),
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      String(w.weight_grams),
      prev === undefined ? "" : (Math.round((w.weight_grams - prev) * 10) / 10).toString(),
      w.logged_by ?? "",
      w.notes ?? "",
    ]);
    lastWeight.set(w.kitten_id, w.weight_grams);
  }

  const csv = `﻿${rows.map((r) => r.map(csvEscape).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `litter-watch-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
