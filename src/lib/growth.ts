import { daysBetween } from "./format";
import type { WeighIn } from "./types";

export type Trend = "ok" | "watch" | "alert" | "none";

export interface KittenStats {
  latest: WeighIn | null;
  previous: WeighIn | null;
  /** grams gained since the previous weigh-in */
  delta: number | null;
  /** g/day over the most recent interval */
  ratePerDay: number | null;
  trend: Trend;
  trendLabel: string;
}

/**
 * Health flag logic. Weigh-ins may happen once or twice a day, so rates are
 * normalized to g/day. A single slow interval is a "watch"; two consecutive
 * slow (or negative) intervals is an "alert".
 */
export function computeStats(sortedAsc: WeighIn[], minDailyGain: number): KittenStats {
  const n = sortedAsc.length;
  if (n === 0) {
    return { latest: null, previous: null, delta: null, ratePerDay: null, trend: "none", trendLabel: "No weigh-ins yet" };
  }
  const latest = sortedAsc[n - 1];
  if (n === 1) {
    return { latest, previous: null, delta: null, ratePerDay: null, trend: "none", trendLabel: "First weigh-in" };
  }
  const previous = sortedAsc[n - 2];

  const rate = (a: WeighIn, b: WeighIn): number => {
    const days = Math.max(daysBetween(a.weighed_at, b.weighed_at), 0.1); // avoid absurd rates for back-to-back entries
    return (b.weight_grams - a.weight_grams) / days;
  };

  const delta = latest.weight_grams - previous.weight_grams;
  const r1 = rate(previous, latest);
  const r2 = n >= 3 ? rate(sortedAsc[n - 3], previous) : null;

  let trend: Trend = "ok";
  let trendLabel = "Gaining well";
  if (r2 !== null && r1 < 0 && r2 < 0) {
    trend = "alert";
    trendLabel = "Losing weight";
  } else if (r2 !== null && r1 < minDailyGain && r2 < minDailyGain) {
    trend = "alert";
    trendLabel = "Flat across weigh-ins";
  } else if (r1 < 0) {
    trend = "watch";
    trendLabel = "Dipped last weigh-in";
  } else if (r1 < minDailyGain) {
    trend = "watch";
    trendLabel = "Slow gain";
  }

  return { latest, previous, delta, ratePerDay: r1, trend, trendLabel };
}

/** Average g/day over (up to) the trailing `windowDays` days. */
export function avgRate(sortedAsc: WeighIn[], windowDays = 7): number | null {
  if (sortedAsc.length < 2) return null;
  const latest = sortedAsc[sortedAsc.length - 1];
  const cutoff = new Date(latest.weighed_at).getTime() - windowDays * 86400000;
  const ref = sortedAsc.find((w) => new Date(w.weighed_at).getTime() >= cutoff) ?? sortedAsc[0];
  if (ref.id === latest.id) return null;
  const days = Math.max(daysBetween(ref.weighed_at, latest.weighed_at), 0.1);
  return (latest.weight_grams - ref.weight_grams) / days;
}
