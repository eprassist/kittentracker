import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GrowthChart } from "../components/GrowthChart";
import { ChevronLeftIcon } from "../components/Icons";
import { TrendBadge } from "../components/TrendBadge";
import { useKittens, useSettings, useWeighIns } from "../hooks/useData";
import { downloadCsv } from "../lib/export";
import { fmtAge, fmtRate, fmtSigned, fmtTime, fmtWeight } from "../lib/format";
import { avgRate, computeStats } from "../lib/growth";
import type { Kitten, WeighIn } from "../lib/types";
import { ErrorNote } from "./Dashboard";

export function Report() {
  const kittensQuery = useKittens();
  const weighInsQuery = useWeighIns();
  const settings = useSettings();
  const [selected, setSelected] = useState<string>("all");

  const active = useMemo(() => (kittensQuery.data ?? []).filter((k) => !k.archived), [kittensQuery.data]);
  const shown = selected === "all" ? active : active.filter((k) => k.id === selected);
  const minGain = settings.data?.min_daily_gain ?? 7;

  const byKitten = useMemo(() => {
    const map = new Map<string, WeighIn[]>();
    const asc = [...(weighInsQuery.data ?? [])].sort((a, b) => a.weighed_at.localeCompare(b.weighed_at));
    for (const w of asc) {
      const arr = map.get(w.kitten_id) ?? [];
      arr.push(w);
      map.set(w.kitten_id, arr);
    }
    return map;
  }, [weighInsQuery.data]);

  if (kittensQuery.isLoading || weighInsQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
  }
  if (kittensQuery.isError || weighInsQuery.isError) {
    return (
      <div className="pt-6">
        <ErrorNote
          message={(kittensQuery.error ?? weighInsQuery.error)?.message}
          onRetry={() => {
            kittensQuery.refetch();
            weighInsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="pt-4 print:pt-0">
      {/* Controls — hidden when printing */}
      <div className="print:hidden">
        <div className="mb-3 flex items-center gap-2">
          <Link to="/settings" aria-label="Back" className="-ml-2 rounded-full p-1.5 text-muted active:bg-surface">
            <ChevronLeftIcon />
          </Link>
          <h1 className="text-2xl font-bold text-ink">Vet report</h1>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <FilterChip label="Whole litter" selected={selected === "all"} onClick={() => setSelected("all")} />
          {active.map((k) => (
            <FilterChip
              key={k.id}
              label={k.name}
              color={k.color}
              selected={selected === k.id}
              onClick={() => setSelected(k.id)}
            />
          ))}
        </div>
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-white active:scale-[0.99]"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(active, weighInsQuery.data ?? [])}
            className="flex-1 rounded-xl border border-hairline bg-surface px-4 py-3 font-semibold text-ink-2 active:bg-page"
          >
            Download CSV
          </button>
        </div>
        <p className="mb-5 text-xs text-muted">
          On iPhone: tap Print, then use the share icon on the preview to save or send the PDF.
        </p>
      </div>

      {/* The report itself */}
      <header className="mb-4 border-b border-hairline pb-3">
        <h2 className="text-xl font-bold text-ink">🐾 Litter Watch — growth report</h2>
        <p className="mt-0.5 text-xs text-muted">
          Generated {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} ·{" "}
          {shown.length} kitten{shown.length === 1 ? "" : "s"} · weights in grams · healthy-gain threshold {minGain} g/day
        </p>
      </header>

      {shown.map((k) => (
        <KittenReport key={k.id} kitten={k} weighIns={byKitten.get(k.id) ?? []} minGain={minGain} />
      ))}
    </div>
  );
}

function FilterChip({ label, color, selected, onClick }: { label: string; color?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
        selected ? "border-ink bg-ink text-white" : "border-hairline bg-surface text-ink-2"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}

function KittenReport({ kitten, weighIns, minGain }: { kitten: Kitten; weighIns: WeighIn[]; minGain: number }) {
  const stats = computeStats(weighIns, minGain);
  const weekRate = avgRate(weighIns, 7);
  const totalGain = weighIns.length >= 2 ? weighIns[weighIns.length - 1].weight_grams - weighIns[0].weight_grams : null;
  const desc = [...weighIns].reverse();

  return (
    <section className="mb-8 break-inside-avoid">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: kitten.color }} />
        <h3 className="text-lg font-bold text-ink">{kitten.name}</h3>
        <span className="text-xs text-muted">
          {[
            kitten.birth_date ? `born ${new Date(`${kitten.birth_date}T00:00:00`).toLocaleDateString()}` : null,
            fmtAge(kitten.birth_date),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      {kitten.notes && <p className="mb-2 text-xs text-ink-2">{kitten.notes}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink">
        <span>
          Current: <b className="tnum">{stats.latest ? fmtWeight(stats.latest.weight_grams) : "—"}</b>
        </span>
        <span>
          Total gain: <b className="tnum">{totalGain !== null ? `${fmtSigned(totalGain)} g` : "—"}</b>
        </span>
        <span>
          Avg (7d): <b className="tnum">{weekRate !== null ? fmtRate(weekRate) : "—"}</b>
        </span>
        <TrendBadge trend={stats.trend} label={stats.trendLabel} />
      </div>

      {weighIns.length > 0 && (
        <div className="mb-3 rounded-xl border border-hairline bg-surface p-2 print:border-0 print:p-0">
          <GrowthChart kittens={[kitten]} weighIns={weighIns} height={180} />
        </div>
      )}

      {desc.length === 0 ? (
        <p className="text-sm text-muted">No weigh-ins recorded.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-baseline text-left text-xs text-muted">
              <th className="py-1.5 pr-2 font-medium">Date</th>
              <th className="py-1.5 pr-2 font-medium">Time</th>
              <th className="py-1.5 pr-2 text-right font-medium">Weight</th>
              <th className="py-1.5 pr-2 text-right font-medium">Change</th>
              <th className="py-1.5 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {desc.map((w, i) => {
              const prev = desc[i + 1];
              const delta = prev ? w.weight_grams - prev.weight_grams : null;
              return (
                <tr key={w.id} className="border-b border-hairline align-top">
                  <td className="py-1.5 pr-2 whitespace-nowrap text-ink">{new Date(w.weighed_at).toLocaleDateString()}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap text-ink-2">{fmtTime(w.weighed_at)}</td>
                  <td className="py-1.5 pr-2 text-right font-semibold text-ink tnum">{fmtWeight(w.weight_grams)}</td>
                  <td className={`py-1.5 pr-2 text-right tnum ${delta !== null && delta < 0 ? "text-bad" : "text-ink-2"}`}>
                    {delta !== null ? `${fmtSigned(delta)} g` : "—"}
                  </td>
                  <td className="py-1.5 text-xs text-ink-2">{w.notes ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
