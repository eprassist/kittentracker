import { type FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MediaCaptureField, type PendingMedia } from "../components/MediaCaptureField";
import { useCreateWeighIns, useKittens } from "../hooks/useData";
import { toLocalInputValue } from "../lib/format";
import { prepareImage, uploadMedia } from "../lib/media";
import type { Kitten, WeighInInput } from "../lib/types";

interface EntryDraft {
  weight: string;
  notes: string;
  media: PendingMedia;
  showNotes: boolean;
}

const emptyDraft = (): EntryDraft => ({ weight: "", notes: "", media: {}, showNotes: false });

export function LogWeighIn() {
  const nav = useNavigate();
  const kittensQuery = useKittens();
  const createWeighIns = useCreateWeighIns();
  const kittens = useMemo(() => (kittensQuery.data ?? []).filter((k) => !k.archived), [kittensQuery.data]);

  const [mode, setMode] = useState<"single" | "litter">("single");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [when, setWhen] = useState(() => toLocalInputValue(new Date()));
  const [loggedBy, setLoggedBy] = useState(() => localStorage.getItem("lw:who") ?? "");
  const [drafts, setDrafts] = useState<Record<string, EntryDraft>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeKitten = selectedId ? kittens.find((k) => k.id === selectedId) : kittens[0];
  const visibleKittens = mode === "single" ? (activeKitten ? [activeKitten] : []) : kittens;

  const draftFor = (id: string) => drafts[id] ?? emptyDraft();
  const setDraft = (id: string, patch: Partial<EntryDraft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...draftFor(id), ...patch } }));

  const filled = kittens.filter((k) => {
    if (mode === "single" && k.id !== activeKitten?.id) return false;
    return draftFor(k.id).weight.trim() !== "";
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || filled.length === 0) return;
    setBusy(true);
    setError(null);
    localStorage.setItem("lw:who", loggedBy.trim());
    try {
      const weighedAt = new Date(when).toISOString();
      const entries: WeighInInput[] = [];
      for (const k of filled) {
        const d = draftFor(k.id);
        const weight = Number.parseFloat(d.weight.replace(",", "."));
        if (!Number.isFinite(weight) || weight <= 0) {
          throw new Error(`Enter a valid weight for ${k.name}`);
        }
        let photoUrl: string | null = null;
        let videoUrl: string | null = null;
        if (d.media.photo) {
          setProgress(`Compressing ${k.name}’s photo…`);
          const blob = await prepareImage(d.media.photo);
          setProgress(`Uploading ${k.name}’s photo…`);
          photoUrl = await uploadMedia(blob, "image/jpeg", (f) =>
            setProgress(`Uploading ${k.name}’s photo… ${Math.round(f * 100)}%`),
          );
        }
        if (d.media.video) {
          videoUrl = await uploadMedia(d.media.video, d.media.video.type || "video/mp4", (f) =>
            setProgress(`Uploading ${k.name}’s video… ${Math.round(f * 100)}%`),
          );
        }
        entries.push({
          kitten_id: k.id,
          weight_grams: weight,
          weighed_at: weighedAt,
          logged_by: loggedBy.trim() || null,
          photo_url: photoUrl,
          video_url: videoUrl,
          notes: d.notes.trim() || null,
        });
      }
      setProgress("Saving…");
      await createWeighIns.mutateAsync(entries);
      nav("/timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — nothing was saved");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (kittensQuery.isLoading) return <p className="py-12 text-center text-sm text-muted">Loading…</p>;

  if (kittens.length === 0) {
    return (
      <div className="pt-10 text-center">
        <p className="text-sm text-ink-2">Add a kitten first, then come back to log a weigh-in.</p>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-accent";

  return (
    <form onSubmit={submit} className="pt-4">
      <h1 className="mb-4 text-2xl font-bold text-ink">Log weigh-in</h1>

      {/* Mode switch */}
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-hairline/60 p-1 text-sm font-semibold">
        {(["single", "litter"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 ${mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
          >
            {m === "single" ? "One kitten" : "Whole litter"}
          </button>
        ))}
      </div>

      {mode === "single" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {kittens.map((k) => {
            const selected = k.id === activeKitten?.id;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setSelectedId(k.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                  selected ? "border-ink bg-ink text-white" : "border-hairline bg-surface text-ink-2"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
                {k.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Shared fields */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Date & time</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} required />
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Logged by</span>
          <input
            type="text"
            value={loggedBy}
            onChange={(e) => setLoggedBy(e.target.value)}
            placeholder="e.g. Jass"
            className={inputCls}
          />
        </label>
      </div>

      {/* Per-kitten entries */}
      <div className="flex flex-col gap-3">
        {visibleKittens.map((k) => (
          <EntryCard key={k.id} kitten={k} draft={draftFor(k.id)} onChange={(patch) => setDraft(k.id, patch)} />
        ))}
      </div>

      {error && <p className="mt-4 text-center text-sm text-bad">{error}</p>}

      <div className="mt-5">
        <button
          type="submit"
          disabled={busy || filled.length === 0}
          className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-50"
        >
          {busy
            ? (progress ?? "Saving…")
            : filled.length > 1
              ? `Save ${filled.length} weigh-ins`
              : "Save weigh-in"}
        </button>
        {mode === "litter" && (
          <p className="mt-2 text-center text-xs text-muted">Kittens without a weight are skipped.</p>
        )}
      </div>
    </form>
  );
}

function EntryCard({ kitten, draft, onChange }: { kitten: Kitten; draft: EntryDraft; onChange: (p: Partial<EntryDraft>) => void }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: kitten.color }} />
        <span className="font-semibold text-ink">{kitten.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={draft.weight}
          onChange={(e) => onChange({ weight: e.target.value })}
          placeholder="0"
          aria-label={`${kitten.name} weight in grams`}
          className="w-28 rounded-xl border border-hairline bg-page px-3.5 py-2.5 text-right text-xl font-bold text-ink tnum outline-none focus:border-accent"
        />
        <span className="text-sm font-medium text-muted">grams</span>
        <button
          type="button"
          onClick={() => onChange({ showNotes: !draft.showNotes })}
          className="ml-auto rounded-lg border border-hairline px-3 py-2 text-sm font-medium text-ink-2 active:bg-page"
        >
          {draft.showNotes || draft.notes ? "Note ✓" : "+ Note"}
        </button>
      </div>
      {(draft.showNotes || draft.notes) && (
        <textarea
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Optional note (feeding, behavior…)"
          rows={2}
          className="mt-2.5 w-full rounded-xl border border-hairline bg-page px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
      )}
      <div className="mt-2.5">
        <MediaCaptureField value={draft.media} onChange={(media) => onChange({ media })} />
      </div>
    </div>
  );
}
