import { useMemo, useState } from "react";
import { GrowthChart } from "../components/GrowthChart";
import { ErrorNote } from "./Dashboard";
import { useKittens, useWeighIns } from "../hooks/useData";

export function ChartPage() {
  const kittensQuery = useKittens();
  const weighIns = useWeighIns();
  const kittens = useMemo(() => (kittensQuery.data ?? []).filter((k) => !k.archived), [kittensQuery.data]);

  // null = all kittens; otherwise solo view of one kitten
  const [solo, setSolo] = useState<string | null>(null);
  const visible = solo ? kittens.filter((k) => k.id === solo) : kittens;

  if (kittensQuery.isLoading || weighIns.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
  }
  if (kittensQuery.isError || weighIns.isError) {
    return (
      <div className="pt-6">
        <ErrorNote
          message={(kittensQuery.error ?? weighIns.error)?.message}
          onRetry={() => {
            kittensQuery.refetch();
            weighIns.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="mb-1 text-2xl font-bold text-ink">Growth</h1>
      <p className="mb-3 text-xs text-muted">
        {solo ? "Tap the kitten again to see the whole litter." : "Tap a kitten to view it on its own."}
      </p>

      {/* Legend chips double as the solo toggle */}
      <div className="mb-4 flex flex-wrap gap-2">
        {kittens.map((k) => {
          const dimmed = solo !== null && solo !== k.id;
          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={solo === k.id}
              onClick={() => setSolo(solo === k.id ? null : k.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-opacity ${
                solo === k.id ? "border-ink bg-ink text-white" : "border-hairline bg-surface text-ink-2"
              } ${dimmed ? "opacity-40" : ""}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
              {k.name}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-black/5">
        <GrowthChart kittens={visible} weighIns={weighIns.data ?? []} height={solo ? 420 : 320} />
      </div>
    </div>
  );
}
