import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GrowthChart } from "../components/GrowthChart";
import { ChevronLeftIcon, PencilIcon, TrashIcon } from "../components/Icons";
import { MediaThumb, mediaItems, useMediaViewer } from "../components/Media";
import { Modal } from "../components/Modal";
import { TrendBadge } from "../components/TrendBadge";
import { useDeleteWeighIn, useKittens, useSettings, useUpdateWeighIn, useWeighIns } from "../hooks/useData";
import { fmtAge, fmtDateTime, fmtSigned, fmtWeight, toLocalInputValue } from "../lib/format";
import { avgRate, computeStats } from "../lib/growth";
import type { WeighIn } from "../lib/types";

export function KittenProfile() {
  const { id } = useParams<{ id: string }>();
  const kittensQuery = useKittens();
  const weighInsQuery = useWeighIns();
  const settings = useSettings();
  const { open, viewer } = useMediaViewer();
  const [editing, setEditing] = useState<WeighIn | null>(null);

  const kitten = kittensQuery.data?.find((k) => k.id === id);
  const asc = useMemo(
    () =>
      (weighInsQuery.data ?? [])
        .filter((w) => w.kitten_id === id)
        .sort((a, b) => a.weighed_at.localeCompare(b.weighed_at)),
    [weighInsQuery.data, id],
  );
  const desc = useMemo(() => [...asc].reverse(), [asc]);

  if (kittensQuery.isLoading || weighInsQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
  }
  if (!kitten) {
    return (
      <div className="pt-10 text-center text-sm text-ink-2">
        Kitten not found.{" "}
        <Link to="/kittens" className="font-semibold text-accent">
          Back to kittens
        </Link>
      </div>
    );
  }

  const stats = computeStats(asc, settings.data?.min_daily_gain ?? 7);
  const weekRate = avgRate(asc, 7);
  const totalGain = asc.length >= 2 ? asc[asc.length - 1].weight_grams - asc[0].weight_grams : null;
  const gallery = desc.flatMap((w) => mediaItems(w));

  return (
    <div className="pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Link to="/" aria-label="Back" className="-ml-2 rounded-full p-1.5 text-muted active:bg-surface">
          <ChevronLeftIcon />
        </Link>
        <span className="h-3 w-3 rounded-full" style={{ background: kitten.color }} />
        <h1 className="text-2xl font-bold text-ink">{kitten.name}</h1>
        {kitten.archived && <span className="rounded-full bg-hairline px-2 py-0.5 text-xs font-medium text-ink-2">archived</span>}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {fmtAge(kitten.birth_date) && <span>{fmtAge(kitten.birth_date)}</span>}
        {kitten.birth_date && <span>born {new Date(`${kitten.birth_date}T00:00:00`).toLocaleDateString()}</span>}
        <TrendBadge trend={stats.trend} label={stats.trendLabel} />
      </div>
      {kitten.notes && <p className="mb-4 text-sm text-ink-2">{kitten.notes}</p>}

      {/* Stat tiles */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <StatTile label="Current" value={stats.latest ? fmtWeight(stats.latest.weight_grams) : "—"} />
        <StatTile
          label="Total gain"
          value={totalGain !== null ? `${fmtSigned(totalGain)} g` : "—"}
          tone={totalGain !== null && totalGain < 0 ? "bad" : "good"}
        />
        <StatTile
          label="Avg (7d)"
          value={weekRate !== null ? `${fmtSigned(weekRate)} g/d` : "—"}
          tone={weekRate !== null && weekRate < 0 ? "bad" : "good"}
        />
      </div>

      <div className="mb-4 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-black/5">
        <GrowthChart kittens={[kitten]} weighIns={asc} height={240} />
      </div>

      {gallery.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-ink">Gallery</h2>
          <div className="mb-4 grid grid-cols-4 gap-2">
            {gallery.map((m) => (
              <MediaThumb key={m.url} item={m} size={0} onClick={() => open(m)} />
            ))}
          </div>
        </>
      )}

      <h2 className="mb-2 text-sm font-semibold text-ink">History</h2>
      {desc.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No weigh-ins yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {desc.map((w, i) => {
            const prev = desc[i + 1];
            const delta = prev ? w.weight_grams - prev.weight_grams : null;
            const media = mediaItems(w);
            return (
              <div key={w.id} className="rounded-2xl bg-surface p-3.5 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-ink tnum">{fmtWeight(w.weight_grams)}</span>
                  {delta !== null && (
                    <span className={`text-xs font-semibold tnum ${delta < 0 ? "text-bad" : "text-good"}`}>{fmtSigned(delta)} g</span>
                  )}
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(w)}
                      aria-label="Edit weigh-in"
                      className="rounded-lg p-2 text-muted active:bg-page"
                    >
                      <PencilIcon width={17} height={17} />
                    </button>
                    <DeleteWeighInButton weighIn={w} />
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {fmtDateTime(new Date(w.weighed_at).getTime())}
                  {w.logged_by ? ` · by ${w.logged_by}` : ""}
                </div>
                {w.notes && <p className="mt-1 text-sm text-ink-2">{w.notes}</p>}
                {media.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {media.map((m) => (
                      <MediaThumb key={m.url} item={m} onClick={() => open(m)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && <EditWeighInModal weighIn={editing} onClose={() => setEditing(null)} />}
      {viewer}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5 shadow-sm ring-1 ring-black/5">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className={`text-base font-bold tnum ${tone === "bad" ? "text-bad" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function DeleteWeighInButton({ weighIn }: { weighIn: WeighIn }) {
  const del = useDeleteWeighIn();
  return (
    <button
      type="button"
      aria-label="Delete weigh-in"
      disabled={del.isPending}
      onClick={() => {
        if (window.confirm("Delete this weigh-in? Attached photos/videos are deleted too.")) {
          del.mutate(weighIn.id);
        }
      }}
      className="rounded-lg p-2 text-muted active:bg-page disabled:opacity-50"
    >
      <TrashIcon width={17} height={17} />
    </button>
  );
}

function EditWeighInModal({ weighIn, onClose }: { weighIn: WeighIn; onClose: () => void }) {
  const update = useUpdateWeighIn();
  const nav = useNavigate();
  const [weight, setWeight] = useState(String(weighIn.weight_grams));
  const [when, setWhen] = useState(toLocalInputValue(new Date(weighIn.weighed_at)));
  const [loggedBy, setLoggedBy] = useState(weighIn.logged_by ?? "");
  const [notes, setNotes] = useState(weighIn.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-xl border border-hairline bg-page px-3.5 py-2.5 text-ink outline-none focus:border-accent";

  async function save() {
    const w = Number.parseFloat(weight.replace(",", "."));
    if (!Number.isFinite(w) || w <= 0) {
      setError("Enter a valid weight");
      return;
    }
    try {
      await update.mutateAsync({
        id: weighIn.id,
        weight_grams: w,
        weighed_at: new Date(when).toISOString(),
        logged_by: loggedBy.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
      nav(`/kittens/${weighIn.kitten_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <Modal title="Edit weigh-in" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Weight (grams)</span>
          <input type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Date & time</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Logged by</span>
          <input type="text" value={loggedBy} onChange={(e) => setLoggedBy(e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Note</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {update.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}
