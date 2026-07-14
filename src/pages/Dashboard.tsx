import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sparkline } from "../components/GrowthChart";
import { ArrowDownIcon, ArrowUpIcon, GearIcon, PawIcon } from "../components/Icons";
import { TrendBadge } from "../components/TrendBadge";
import { useKittens, useSettings, useWeighIns } from "../hooks/useData";
import { fmtAge, fmtRate, fmtSigned, fmtWeight, relTime } from "../lib/format";
import { computeStats } from "../lib/growth";
import type { Kitten, WeighIn } from "../lib/types";

export function Dashboard() {
  const kittens = useKittens();
  const weighIns = useWeighIns();
  const settings = useSettings();

  const active = (kittens.data ?? []).filter((k) => !k.archived);
  const minGain = settings.data?.min_daily_gain ?? 7;

  const byKitten = useMemo(() => {
    const map = new Map<string, WeighIn[]>();
    const sorted = [...(weighIns.data ?? [])].sort((a, b) => a.weighed_at.localeCompare(b.weighed_at));
    for (const w of sorted) {
      const arr = map.get(w.kitten_id) ?? [];
      arr.push(w);
      map.set(w.kitten_id, arr);
    }
    return map;
  }, [weighIns.data]);

  const lastWeighIn = weighIns.data?.[0];

  return (
    <div className="pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <PawIcon width={24} height={24} className="text-accent" />
            Litter Watch
          </h1>
          {lastWeighIn && (
            <p className="mt-0.5 text-xs text-muted">
              {active.length} kitten{active.length === 1 ? "" : "s"} · last weigh-in {relTime(lastWeighIn.weighed_at)}
            </p>
          )}
        </div>
        <Link to="/settings" aria-label="Settings" className="rounded-full p-2 text-muted active:bg-surface">
          <GearIcon />
        </Link>
      </header>

      {kittens.isLoading || weighIns.isLoading ? (
        <p className="py-12 text-center text-sm text-muted">Loading…</p>
      ) : kittens.isError || weighIns.isError ? (
        <ErrorNote
          message={(kittens.error ?? weighIns.error)?.message}
          onRetry={() => {
            kittens.refetch();
            weighIns.refetch();
          }}
        />
      ) : active.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
          <div className="mb-2 text-4xl">🐈</div>
          <p className="mb-4 text-sm text-ink-2">No kittens yet — add your litter to get started.</p>
          <Link to="/kittens" className="inline-block rounded-xl bg-accent px-4 py-2.5 font-semibold text-white">
            Add kittens
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {active.map((k) => (
            <KittenTile key={k.id} kitten={k} weighIns={byKitten.get(k.id) ?? []} minGain={minGain} />
          ))}
        </div>
      )}
    </div>
  );
}

function KittenTile({ kitten, weighIns, minGain }: { kitten: Kitten; weighIns: WeighIn[]; minGain: number }) {
  const stats = computeStats(weighIns, minGain);
  const age = fmtAge(kitten.birth_date);
  const spark = weighIns.slice(-10).map((w) => w.weight_grams);

  return (
    <Link to={`/kittens/${kitten.id}`} className="rounded-2xl bg-surface p-3.5 shadow-sm ring-1 ring-black/5 active:scale-[0.99]">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: kitten.color }} />
        <span className="truncate font-semibold text-ink">{kitten.name}</span>
      </div>
      {age && <div className="mt-0.5 text-[11px] text-muted">{age}</div>}

      {stats.latest ? (
        <>
          <div className="mt-2 text-2xl font-bold text-ink tnum">{fmtWeight(stats.latest.weight_grams)}</div>
          {stats.delta !== null && stats.ratePerDay !== null && (
            <div className={`mt-0.5 flex items-center gap-1 text-xs font-medium tnum ${stats.delta < 0 ? "text-bad" : "text-good"}`}>
              {stats.delta < 0 ? <ArrowDownIcon width={12} height={12} strokeWidth={2.4} /> : <ArrowUpIcon width={12} height={12} strokeWidth={2.4} />}
              {fmtSigned(stats.delta)} g ({fmtRate(stats.ratePerDay)})
            </div>
          )}
          <div className="mt-2 flex items-end justify-between gap-1">
            <TrendBadge trend={stats.trend === "ok" ? "none" : stats.trend} label={stats.trendLabel} />
            <Sparkline weights={spark} color={kitten.color} width={80} height={26} />
          </div>
        </>
      ) : (
        <div className="mt-2 text-sm text-muted">No weigh-ins yet</div>
      )}
    </Link>
  );
}

export function ErrorNote({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-surface p-5 text-center shadow-sm">
      <p className="text-sm text-bad">{message ?? "Something went wrong"}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-ink-2">
          Try again
        </button>
      )}
    </div>
  );
}
