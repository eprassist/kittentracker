import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, ChevronLeftIcon, PencilIcon, PlusIcon } from "../components/Icons";
import { Modal } from "../components/Modal";
import {
  useCalendarUrl,
  useCreateSchedule,
  useDeleteSchedule,
  useKittens,
  useMarkScheduleDone,
  usePushDevices,
  useSchedules,
  useUpdateSchedule,
} from "../hooks/useData";
import { CARE_TYPES, INTERVAL_OPTIONS, SCHEDULE_PRESETS, careType, dueStatus, intervalLabel, todayInput } from "../lib/care";
import { type PushState, currentPushState, disablePush, enablePush, pushSupported } from "../lib/push";
import type { CareSchedule, CareType, Kitten } from "../lib/types";
import { ErrorNote } from "./Dashboard";

export function Care() {
  const kittensQuery = useKittens();
  const schedules = useSchedules();
  const [editing, setEditing] = useState<CareSchedule | "new" | null>(null);

  const cats = (kittensQuery.data ?? []).filter((k) => !k.archived);
  const catById = new Map(cats.map((k) => [k.id, k]));

  if (kittensQuery.isLoading || schedules.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
  }
  if (schedules.isError) {
    return (
      <div className="pt-6">
        <ErrorNote message={schedules.error?.message} onRetry={() => schedules.refetch()} />
      </div>
    );
  }

  const items = schedules.data ?? [];

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" aria-label="Back" className="-ml-2 rounded-full p-1.5 text-muted active:bg-surface">
            <ChevronLeftIcon />
          </Link>
          <h1 className="text-2xl font-bold text-ink">Care schedule</h1>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <PlusIcon width={16} height={16} strokeWidth={2.4} /> Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
          <div className="mb-2 text-3xl">🗓️</div>
          <p className="mb-1 text-sm font-semibold text-ink">No care schedules yet</p>
          <p className="text-sm text-ink-2">
            Add recurring care — vaccination boosters, flea & worm treatments, dental checks — and Litter Watch keeps
            track of when each cat is due.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((s) => (
            <ScheduleCard key={s.id} schedule={s} cat={catById.get(s.cat_id)} onEdit={() => setEditing(s)} />
          ))}
        </div>
      )}

      <Reminders />

      {editing && (
        <ScheduleFormModal schedule={editing === "new" ? null : editing} cats={cats} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ScheduleCard({ schedule, cat, onEdit }: { schedule: CareSchedule; cat?: Kitten; onEdit: () => void }) {
  const done = useMarkScheduleDone();
  const status = dueStatus(schedule.next_due);
  const type = careType(schedule.type);
  const toneCls =
    status.tone === "overdue"
      ? "bg-bad/10 text-bad"
      : status.tone === "today"
        ? "bg-warn/10 text-warn"
        : status.tone === "soon"
          ? "bg-accent-soft text-accent"
          : "bg-hairline/60 text-ink-2";

  return (
    <div className="rounded-2xl bg-surface p-3.5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-xl">{type.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">{schedule.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {cat && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                {cat.name}
              </span>
            )}
            <span>· {intervalLabel(schedule.interval_days)}</span>
          </div>
          {schedule.notes && <p className="mt-1 text-xs text-ink-2">{schedule.notes}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneCls}`}>{status.label}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            disabled={done.isPending}
            onClick={() => done.mutate(schedule.id)}
            className="flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-semibold text-good active:bg-page disabled:opacity-50"
          >
            <CheckIcon width={14} height={14} strokeWidth={2.6} /> Done
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit schedule"
            className="rounded-lg p-1.5 text-muted active:bg-page"
          >
            <PencilIcon width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleFormModal({ schedule, cats, onClose }: { schedule: CareSchedule | null; cats: Kitten[]; onClose: () => void }) {
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const del = useDeleteSchedule();
  const [catId, setCatId] = useState(schedule?.cat_id ?? cats[0]?.id ?? "");
  const [type, setType] = useState<CareType>(schedule?.type ?? "vaccination");
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [intervalDays, setIntervalDays] = useState<number | null>(schedule ? schedule.interval_days : 182);
  const [nextDue, setNextDue] = useState(schedule?.next_due?.slice(0, 10) ?? todayInput());
  const [notes, setNotes] = useState(schedule?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || update.isPending || del.isPending;

  const inputCls = "w-full rounded-xl border border-hairline bg-page px-3.5 py-2.5 text-ink outline-none focus:border-accent";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !catId || !nextDue) {
      setError("Pick a cat, a title and a due date");
      return;
    }
    try {
      const body = { cat_id: catId, type, title: title.trim(), interval_days: intervalDays, next_due: nextDue, notes: notes.trim() || null };
      if (schedule) await update.mutateAsync({ id: schedule.id, ...body });
      else await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  async function remove() {
    if (!schedule) return;
    if (!window.confirm("Delete this schedule? Past completions stay in the health record.")) return;
    try {
      await del.mutateAsync(schedule.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <Modal title={schedule ? "Edit schedule" : "Add care schedule"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {!schedule && (
          <div>
            <span className="mb-1 block text-xs font-medium text-ink-2">Quick add</span>
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setTitle(p.title);
                    setType(p.type);
                    setIntervalDays(p.intervalDays);
                  }}
                  className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 active:bg-page"
                >
                  {careType(p.type).emoji} {p.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <span className="mb-1 block text-xs font-medium text-ink-2">Cat</span>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setCatId(k.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                  catId === k.id ? "border-ink bg-ink text-white" : "border-hairline bg-surface text-ink-2"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
                {k.name}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">What</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vaccination booster" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as CareType)} className={inputCls}>
            {CARE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-2">Next due</span>
            <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className={inputCls} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-ink-2">Repeats</span>
            <select
              value={intervalDays === null ? "" : String(intervalDays)}
              onChange={(e) => setIntervalDays(e.target.value === "" ? null : Number(e.target.value))}
              className={inputCls}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.label} value={o.days === null ? "" : String(o.days)}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span className="mb-1 block text-xs font-medium text-ink-2">Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vaccine name, dose, vet…" className={inputCls} />
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : schedule ? "Save changes" : "Add schedule"}
        </button>
        {schedule && (
          <button type="button" onClick={remove} disabled={busy} className="py-1 text-sm font-medium text-bad disabled:opacity-50">
            Delete schedule…
          </button>
        )}
      </form>
    </Modal>
  );
}

function Reminders() {
  const calendar = useCalendarUrl();
  const devices = usePushDevices();
  const [pushState, setPushState] = useState<PushState>("unsupported");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    currentPushState().then(setPushState);
  }, []);

  async function togglePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushState === "on") {
        await disablePush();
        setPushState("off");
      } else {
        await enablePush();
        setPushState("on");
      }
      devices.refetch();
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Couldn't change notification settings");
    } finally {
      setPushBusy(false);
    }
  }

  async function copyUrl() {
    if (!calendar.data?.url) return;
    try {
      await navigator.clipboard.writeText(calendar.data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", calendar.data.url);
    }
  }

  return (
    <>
      <h2 className="mt-6 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Reminders</h2>

      <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
        <div className="text-sm font-semibold text-ink">📅 Google Calendar</div>
        <p className="mt-1 text-xs text-ink-2">
          Subscribe once and every care item appears in your calendar with your normal Google notifications — on both
          phones.
        </p>
        <button
          type="button"
          onClick={copyUrl}
          disabled={!calendar.data?.url}
          className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
        >
          {copied ? "Copied ✓" : "Copy calendar link"}
        </button>
        <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-ink-2">
          <li>
            Open{" "}
            <a href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noreferrer" className="font-medium text-accent underline">
              Google Calendar → Add calendar → From URL
            </a>{" "}
            (easiest on a computer)
          </li>
          <li>Paste the link and tap Add calendar</li>
          <li>"Litter Watch care" appears in your calendar list — new schedules sync automatically (Google refreshes every few hours)</li>
        </ol>
      </div>

      <div className="mt-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
        <div className="text-sm font-semibold text-ink">🔔 App notifications</div>
        <p className="mt-1 text-xs text-ink-2">
          Get a morning notification on this phone when something is due. On iPhone this only works from the installed
          Home Screen app.
        </p>
        {pushState === "unsupported" && !pushSupported() ? (
          <p className="mt-2 text-xs text-muted">Not available in this browser — open the installed app instead.</p>
        ) : pushState === "denied" ? (
          <p className="mt-2 text-xs text-bad">
            Notifications are blocked for this app — enable them in iPhone Settings → Notifications → Litter Watch.
          </p>
        ) : (
          <button
            type="button"
            onClick={togglePush}
            disabled={pushBusy}
            className={`mt-3 rounded-xl px-4 py-2 text-sm font-semibold active:scale-[0.98] disabled:opacity-50 ${
              pushState === "on" ? "border border-hairline text-ink-2" : "bg-accent text-white"
            }`}
          >
            {pushBusy ? "Working…" : pushState === "on" ? "Disable on this phone" : "Enable on this phone"}
          </button>
        )}
        {pushError && <p className="mt-2 text-xs text-bad">{pushError}</p>}
        {(devices.data?.length ?? 0) > 0 && (
          <p className="mt-2 text-xs text-muted">
            Enrolled devices: {devices.data!.map((d) => d.label ?? "device").join(", ")}
          </p>
        )}
      </div>
    </>
  );
}
