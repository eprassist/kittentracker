import type { Trend } from "../lib/growth";
import { AlertIcon, ArrowDownIcon, CheckIcon } from "./Icons";

/** Health flag chip — icon + label always together, never color alone. */
export function TrendBadge({ trend, label }: { trend: Trend; label: string }) {
  if (trend === "none") return null;
  if (trend === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-good">
        <CheckIcon width={13} height={13} strokeWidth={2.4} />
        {label}
      </span>
    );
  }
  const alert = trend === "alert";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        alert ? "bg-bad/10 text-bad" : "bg-warn/10 text-warn"
      }`}
    >
      {alert ? <ArrowDownIcon width={13} height={13} strokeWidth={2.4} /> : <AlertIcon width={13} height={13} strokeWidth={2.2} />}
      {label}
    </span>
  );
}
