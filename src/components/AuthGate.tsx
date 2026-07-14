import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { UNAUTHORIZED_EVENT, api } from "../lib/api";

type AuthState = "checking" | "in" | "out";

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("checking");
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    api("/api/session")
      .then(() => !cancelled && setState("in"))
      .catch(() => !cancelled && setState("out"));
    const onUnauthorized = () => setState("out");
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <div className="animate-pulse text-4xl">🐾</div>
      </div>
    );
  }

  if (state === "out") {
    return (
      <PasscodeScreen
        onSuccess={() => {
          qc.invalidateQueries();
          setState("in");
        }}
      />
    );
  }

  return <>{children}</>;
}

function PasscodeScreen({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!passcode.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({ passcode }) });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-page px-6 pb-safe">
      <div className="text-center">
        <div className="mb-3 text-6xl">🐈</div>
        <h1 className="text-2xl font-bold text-ink">Litter Watch</h1>
        <p className="mt-1 text-sm text-ink-2">Enter the household passcode</p>
      </div>
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          inputMode="text"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-center text-lg text-ink shadow-sm outline-none focus:border-accent"
        />
        {error && <p className="text-center text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={busy || !passcode.trim()}
          className="rounded-xl bg-accent px-4 py-3 text-lg font-semibold text-white shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
