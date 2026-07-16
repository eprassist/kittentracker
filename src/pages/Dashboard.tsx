import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sparkline } from "../components/GrowthChart";
import { ArrowDownIcon, ArrowUpIcon, GearIcon, PawIcon, ShareIcon } from "../components/Icons";
import { TrendBadge } from "../components/TrendBadge";
import { useKittens, useSchedules, useSettings, useWeighIns } from "../hooks/useData";
import { careType, dueStatus } from "../lib/care";
import { fmtAge, fmtRate, fmtSigned, fmtWeight, relTime } from "../lib/format";
import { computeStats } from "../lib/growth";
import type { Kitten, WeighIn } from "../lib/types";

export function Dashboard() {
  const kittens = useKittens();
  const weighIns = useWeighIns();
  const settings = useSettings();

  const active = (kittens.data ?? []).filter((k) => !k.archived && k.role !== "parent");
  const parents = (kittens.data ?? []).filter((k) => !k.archived && k.role === "parent");
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
        <div className="flex items-center">
          <Link to="/report" aria-label="Vet report & export" className="rounded-full p-2 text-muted active:bg-surface">
            <ShareIcon />
          </Link>
          <Link to="/settings" aria-label="Settings" className="rounded-full p-2 text-muted active:bg-surface">
            <GearIcon />
          </Link>
        </div>
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
      ) : active.length === 0 && parents.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
          <div className="mb-2 text-4xl">🐈</div>
          <p className="mb-4 text-sm text-ink-2">No kittens yet — add your litter to get started.</p>
          <Link to="/kittens" className="inline-block rounded-xl bg-accent px-4 py-2.5 font-semibold text-white">
            Add kittens
          </Link>
        </div>
      ) : (
        <>
          <CareDueCard />
          <div className="grid grid-cols-2 gap-3">
            {active.map((k) => (
              <KittenTile key={k.id} kitten={k} weighIns={byKitten.get(k.id) ?? []} minGain={minGain} />
            ))}
          </div>
          {parents.length > 0 && (
            <>
              <h2 className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Parents</h2>
              <div className="flex flex-col gap-2">
                {parents.map((k) => {
                  const latest = byKitten.get(k.id)?.at(-1);
                  return (
                    <Link
                      key={k.id}
                      to={`/kittens/${k.id}`}
                      className="flex items-center gap-2.5 rounded-2xl bg-surface px-3.5 py-3 shadow-sm ring-1 ring-black/5 active:scale-[0.99]"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: k.color }} />
                      <span className="font-semibold text-ink">{k.name}</span>
                      <span className="text-xs text-muted">
                        {k.sex === "female" ? "♀" : k.sex === "male" ? "♂" : ""}
                      </span>
                      {latest && <span className="ml-auto text-sm font-semibold text-ink-2 tnum">{fmtWeight(latest.weight_grams)}</span>}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function CareDueCard() {
  const schedules = useSchedules();
  const items = schedules.data ?? [];
  if (schedules.isError) return null;
  const due = items.filter((s) => dueStatus(s.next_due).days <= 3);
  const next = items[0]; // list is sorted by next_due

  return (
    <Link
      to="/care"
      className={`mb-3 flex items-center gap-2.5 rounded-2xl px-3.5 py-3 shadow-sm ring-1 active:scale-[0.99] ${
        due.length > 0 ? "bg-warn/10 ring-warn/30" : "bg-surface ring-black/5"
      }`}
    >
      <span className="text-lg">🗓️</span>
      <span className="min-w-0 flex-1 text-sm">
        {due.length > 0 ? (
          <span className="font-semibold text-ink">
            {due.length} care item{due.length === 1 ? "" : "s"} due —{" "}
            <span className="font-normal text-ink-2">
              {careType(due[0].type).emoji} {due[0].title}
              {due.length > 1 ? "…" : ""}
            </span>
          </span>
        ) : next ? (
          <span className="text-ink-2">
            Care schedule · next: {careType(next.type).emoji} {next.title}, {dueStatus(next.next_due).label.toLowerCase()}
          </span>
        ) : (
          <span className="text-ink-2">Care schedule · set up vaccination & treatment reminders</span>
        )}
      </span>
      <span className="text-muted">›</span>
    </Link>
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
