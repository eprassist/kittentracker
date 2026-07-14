import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlusIcon } from "../components/Icons";
import { Modal } from "../components/Modal";
import {
  useCreateKitten,
  useDeleteKitten,
  useKittens,
  useSeedSample,
  useUpdateKitten,
  useWeighIns,
} from "../hooks/useData";
import { fmtAge, fmtWeight } from "../lib/format";
import { KITTEN_COLORS, nextColor } from "../lib/palette";
import type { Kitten } from "../lib/types";
import { ErrorNote } from "./Dashboard";

export function Kittens() {
  const kittensQuery = useKittens();
  const weighIns = useWeighIns();
  const seed = useSeedSample();
  const [editing, setEditing] = useState<Kitten | "new" | null>(null);

  const kittens = kittensQuery.data ?? [];
  const active = kittens.filter((k) => !k.archived);
  const archived = kittens.filter((k) => k.archived);

  const latestByKitten = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of weighIns.data ?? []) {
      if (!map.has(w.kitten_id)) map.set(w.kitten_id, w.weight_grams); // list is newest-first
    }
    return map;
  }, [weighIns.data]);

  if (kittensQuery.isLoading) return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
  if (kittensQuery.isError) {
    return (
      <div className="pt-6">
        <ErrorNote message={kittensQuery.error?.message} onRetry={() => kittensQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Kittens</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <PlusIcon width={16} height={16} strokeWidth={2.4} /> Add
        </button>
      </div>

      {kittens.length === 0 && (
        <div className="mb-4 rounded-2xl bg-surface p-6 text-center shadow-sm">
          <div className="mb-2 text-4xl">🐈</div>
          <p className="mb-4 text-sm text-ink-2">Add your kittens — or load a sample litter to try the app out.</p>
          <button
            type="button"
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
            className="rounded-xl border border-hairline bg-page px-4 py-2.5 text-sm font-semibold text-ink-2 disabled:opacity-50"
          >
            {seed.isPending ? "Loading…" : "Load sample litter (4 kittens)"}
          </button>
          {seed.isError && <p className="mt-2 text-xs text-bad">{seed.error.message}</p>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {active.map((k) => (
          <KittenRow key={k.id} kitten={k} latest={latestByKitten.get(k.id)} onEdit={() => setEditing(k)} />
        ))}
      </div>

      {archived.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Archived</h2>
          <div className="flex flex-col gap-2 opacity-70">
            {archived.map((k) => (
              <KittenRow key={k.id} kitten={k} latest={latestByKitten.get(k.id)} onEdit={() => setEditing(k)} />
            ))}
          </div>
        </>
      )}

      {editing && (
        <KittenFormModal
          kitten={editing === "new" ? null : editing}
          takenColors={kittens.map((k) => k.color)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function KittenRow({ kitten, latest, onEdit }: { kitten: Kitten; latest?: number; onEdit: () => void }) {
  const update = useUpdateKitten();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-sm ring-1 ring-black/5">
      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: kitten.color }} />
      <Link to={`/kittens/${kitten.id}`} className="min-w-0 flex-1">
        <div className="truncate font-semibold text-ink">{kitten.name}</div>
        <div className="text-xs text-muted">
          {[fmtAge(kitten.birth_date), latest !== undefined ? fmtWeight(latest) : null].filter(Boolean).join(" · ") || "No weigh-ins yet"}
        </div>
      </Link>
      <button type="button" onClick={onEdit} className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink-2 active:bg-page">
        Edit
      </button>
      <button
        type="button"
        disabled={update.isPending}
        onClick={() => update.mutate({ id: kitten.id, archived: !kitten.archived })}
        className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink-2 active:bg-page disabled:opacity-50"
      >
        {kitten.archived ? "Restore" : "Archive"}
      </button>
    </div>
  );
}

function KittenFormModal({ kitten, takenColors, onClose }: { kitten: Kitten | null; takenColors: string[]; onClose: () => void }) {
  const create = useCreateKitten();
  const update = useUpdateKitten();
  const del = useDeleteKitten();
  const [name, setName] = useState(kitten?.name ?? "");
  const [color, setColor] = useState(kitten?.color ?? nextColor(takenColors));
  const [birthDate, setBirthDate] = useState(kitten?.birth_date ?? "");
  const [notes, setNotes] = useState(kitten?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending || del.isPending;

  const inputCls = "w-full rounded-xl border border-hairline bg-page px-3.5 py-2.5 text-ink outline-none focus:border-accent";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the kitten a name");
      return;
    }
    try {
      const body = { name: name.trim(), color, birth_date: birthDate || null, notes: notes.trim() || null };
      if (kitten) await update.mutateAsync({ id: kitten.id, ...body });
      else await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  async function remove() {
    if (!kitten) return;
    if (!window.confirm(`Delete ${kitten.name} and ALL their weigh-ins, photos and videos? This can't be undone. (Tip: archive instead to keep the history.)`)) return;
    try {
      await del.mutateAsync(kitten.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <Modal title={kitten ? `Edit ${kitten.name}` : "Add kitten"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus={!kitten} />
        </label>
        <div>
          <span className="mb-1 block text-xs font-medium text-ink-2">Color tag</span>
          <div className="flex flex-wrap gap-2.5">
            {KITTEN_COLORS.map((c) => {
              const takenByOther = takenColors.some((t) => t.toLowerCase() === c.value.toLowerCase()) && c.value.toLowerCase() !== (kitten?.color ?? "").toLowerCase();
              const selected = color.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-label={`${c.name}${takenByOther ? " (used by another kitten)" : ""}`}
                  onClick={() => setColor(c.value)}
                  className={`h-9 w-9 rounded-full transition-transform ${selected ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""} ${takenByOther && !selected ? "opacity-35" : ""}`}
                  style={{ background: c.value }}
                />
              );
            })}
          </div>
        </div>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Birth date</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Markings, temperament…" className={inputCls} />
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : kitten ? "Save changes" : "Add kitten"}
        </button>
        {kitten && (
          <button type="button" onClick={remove} disabled={busy} className="py-1 text-sm font-medium text-bad disabled:opacity-50">
            Delete kitten…
          </button>
        )}
      </form>
    </Modal>
  );
}
