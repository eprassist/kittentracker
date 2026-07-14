import { Fragment, useMemo } from "react";
import { Link } from "react-router-dom";
import { MediaThumb, mediaItems, useMediaViewer } from "../components/Media";
import { ErrorNote } from "./Dashboard";
import { useKittens, useWeighIns } from "../hooks/useData";
import { fmtDayHeading, fmtSigned, fmtTime, fmtWeight } from "../lib/format";
import type { WeighIn } from "../lib/types";

export function Timeline() {
  const kittensQuery = useKittens();
  const weighIns = useWeighIns();
  const { open, viewer } = useMediaViewer();

  const kittenById = useMemo(() => new Map((kittensQuery.data ?? []).map((k) => [k.id, k])), [kittensQuery.data]);

  // Delta vs. the previous weigh-in of the same kitten
  const deltas = useMemo(() => {
    const map = new Map<string, number | null>();
    const asc = [...(weighIns.data ?? [])].sort((a, b) => a.weighed_at.localeCompare(b.weighed_at));
    const lastWeight = new Map<string, number>();
    for (const w of asc) {
      const prev = lastWeight.get(w.kitten_id);
      map.set(w.id, prev === undefined ? null : w.weight_grams - prev);
      lastWeight.set(w.kitten_id, w.weight_grams);
    }
    return map;
  }, [weighIns.data]);

  // Group by calendar day (list is already newest-first)
  const groups = useMemo(() => {
    const result: { day: string; entries: WeighIn[] }[] = [];
    for (const w of weighIns.data ?? []) {
      const day = new Date(w.weighed_at).toDateString();
      const last = result[result.length - 1];
      if (last && last.day === day) last.entries.push(w);
      else result.push({ day, entries: [w] });
    }
    return result;
  }, [weighIns.data]);

  if (kittensQuery.isLoading || weighIns.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
  }
  if (weighIns.isError) {
    return (
      <div className="pt-6">
        <ErrorNote message={weighIns.error?.message} onRetry={() => weighIns.refetch()} />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <h1 className="mb-4 text-2xl font-bold text-ink">Timeline</h1>
      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          No weigh-ins yet — log the first one from the big orange button.
        </p>
      ) : (
        groups.map((g) => (
          <Fragment key={g.day}>
            <h2 className="sticky top-0 z-10 -mx-4 bg-page/95 px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase backdrop-blur">
              {fmtDayHeading(g.entries[0].weighed_at)}
            </h2>
            <div className="mb-3 flex flex-col gap-2">
              {g.entries.map((w) => {
                const kitten = kittenById.get(w.kitten_id);
                const delta = deltas.get(w.id) ?? null;
                const media = mediaItems(w);
                return (
                  <div key={w.id} className="flex gap-3 rounded-2xl bg-surface p-3.5 shadow-sm ring-1 ring-black/5">
                    <span className="mt-1 h-full w-1 shrink-0 self-stretch rounded-full" style={{ background: kitten?.color ?? "#c3c2b7" }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <Link to={`/kittens/${w.kitten_id}`} className="font-semibold text-ink">
                          {kitten?.name ?? "Unknown"}
                        </Link>
                        <span className="text-lg font-bold text-ink tnum">{fmtWeight(w.weight_grams)}</span>
                        {delta !== null && (
                          <span className={`text-xs font-semibold tnum ${delta < 0 ? "text-bad" : "text-good"}`}>
                            {fmtSigned(delta)} g
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {fmtTime(w.weighed_at)}
                        {w.logged_by ? ` · by ${w.logged_by}` : ""}
                      </div>
                      {w.notes && <p className="mt-1.5 text-sm text-ink-2">{w.notes}</p>}
                      {media.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {media.map((m) => (
                            <MediaThumb key={m.url} item={m} onClick={() => open(m)} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Fragment>
        ))
      )}
      {viewer}
    </div>
  );
}
