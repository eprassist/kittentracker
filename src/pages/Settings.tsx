import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "../components/Icons";
import { useSaveSettings, useSettings } from "../hooks/useData";
import { api } from "../lib/api";
import { ErrorNote } from "./Dashboard";

export function Settings() {
  const settings = useSettings();
  const save = useSaveSettings();
  const [minGain, setMinGain] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) setMinGain(String(settings.data.min_daily_gain));
  }, [settings.data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number.parseFloat(minGain.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return;
    await save.mutateAsync({ min_daily_gain: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logout() {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    window.location.reload();
  }

  if (settings.isLoading) return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
  if (settings.isError) {
    return (
      <div className="pt-6">
        <ErrorNote message={settings.error?.message} onRetry={() => settings.refetch()} />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/" aria-label="Back" className="-ml-2 rounded-full p-1.5 text-muted active:bg-surface">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
      </div>

      <form onSubmit={submit} className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Healthy gain threshold</span>
          <span className="mb-2 block text-xs text-ink-2">
            Kittens gaining less than this (in grams per day, averaged between weigh-ins) get flagged on the dashboard.
            Newborns typically gain 7–15 g/day.
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={minGain}
              onChange={(e) => setMinGain(e.target.value)}
              className="w-24 rounded-xl border border-hairline bg-page px-3.5 py-2.5 text-right font-bold text-ink tnum outline-none focus:border-accent"
            />
            <span className="text-sm text-muted">g/day</span>
            <button
              type="submit"
              disabled={save.isPending}
              className="ml-auto rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          </div>
          {save.isError && <p className="mt-2 text-xs text-bad">{save.error.message}</p>}
        </label>
      </form>

      <div className="mt-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
        <div className="text-sm font-semibold text-ink">Household</div>
        <p className="mt-1 text-xs text-ink-2">
          This device stays signed in with the shared passcode. Lock the app if you're handing your phone to someone else.
        </p>
        <button type="button" onClick={logout} className="mt-3 rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-ink-2 active:bg-page">
          Lock app
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted">Litter Watch · made with 🐾</p>
    </div>
  );
}
