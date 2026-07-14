import { useMemo, useState } from "react";
import { GrowthChart } from "../components/GrowthChart";
import { MediaThumb, mediaItems, useMediaViewer } from "../components/Media";
import { useKittens, useWeighIns } from "../hooks/useData";
import { fmtAge, fmtDateShort, fmtWeight } from "../lib/format";
import type { Kitten, WeighIn } from "../lib/types";
import { ErrorNote } from "./Dashboard";

export function ChartPage() {
  const kittensQuery = useKittens();
  const weighIns = useWeighIns();
  const kittens = useMemo(() => (kittensQuery.data ?? []).filter((k) => !k.archived), [kittensQuery.data]);

  const [view, setView] = useState<"chart" | "photos">("chart");
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
      <h1 className="mb-3 text-2xl font-bold text-ink">Growth</h1>

      {/* View switch */}
      <div className="mb-3 grid grid-cols-2 rounded-xl bg-hairline/60 p-1 text-sm font-semibold">
        {(["chart", "photos"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg py-2 ${view === v ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
          >
            {v === "chart" ? "Chart" : "Photos"}
          </button>
        ))}
      </div>

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

      {view === "chart" ? (
        <div className="rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-black/5">
          <GrowthChart kittens={visible} weighIns={weighIns.data ?? []} height={solo ? 420 : 320} />
        </div>
      ) : (
        <PhotoTimeline kittens={visible} allKittens={kittens} weighIns={weighIns.data ?? []} />
      )}
    </div>
  );
}

/** Chronological media gallery: watch the litter grow photo by photo. */
function PhotoTimeline({ kittens, allKittens, weighIns }: { kittens: Kitten[]; allKittens: Kitten[]; weighIns: WeighIn[] }) {
  const { open, viewer } = useMediaViewer();
  const byId = useMemo(() => new Map(allKittens.map((k) => [k.id, k])), [allKittens]);
  const ids = useMemo(() => new Set(kittens.map((k) => k.id)), [kittens]);

  const entries = useMemo(
    () =>
      weighIns
        .filter((w) => ids.has(w.kitten_id) && (w.photo_url || w.video_url))
        .sort((a, b) => a.weighed_at.localeCompare(b.weighed_at)), // oldest first — watch them grow
    [weighIns, ids],
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center shadow-sm">
        <div className="mb-2 text-3xl">📷</div>
        <p className="text-sm text-ink-2">
          No photos yet{kittens.length < allKittens.length ? " for this kitten" : ""}. Attach a photo when you log a
          weigh-in and it'll show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {entries.map((w) => {
          const kitten = byId.get(w.kitten_id);
          const media = mediaItems(w);
          return media.map((m) => (
            <figure key={`${w.id}-${m.kind}`} className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5">
              <MediaThumb item={m} size={0} onClick={() => open(m)} />
              <figcaption className="px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: kitten?.color ?? "#c3c2b7" }} />
                  <span className="truncate">{kitten?.name ?? "Unknown"}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {[
                    fmtDateShort(new Date(w.weighed_at).getTime()),
                    fmtAge(kitten?.birth_date ?? null, new Date(w.weighed_at)),
                    fmtWeight(w.weight_grams),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </figcaption>
            </figure>
          ));
        })}
      </div>
      {viewer}
    </>
  );
}
