import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDateShort, fmtDateTime, fmtTime } from "../lib/format";
import type { Kitten, WeighIn } from "../lib/types";

interface Props {
  kittens: Kitten[]; // the kittens to draw (already filtered to visible)
  weighIns: WeighIn[];
  height?: number;
}

type Row = { t: number } & Record<string, number>;

export function GrowthChart({ kittens, weighIns, height = 300 }: Props) {
  const ids = useMemo(() => new Set(kittens.map((k) => k.id)), [kittens]);

  const rows = useMemo(() => {
    const byTime = new Map<number, Row>();
    for (const w of weighIns) {
      if (!ids.has(w.kitten_id)) continue;
      const t = new Date(w.weighed_at).getTime();
      const row = byTime.get(t) ?? ({ t } as Row);
      row[w.kitten_id] = w.weight_grams;
      byTime.set(t, row);
    }
    return [...byTime.values()].sort((a, b) => a.t - b.t);
  }, [weighIns, ids]);

  const spanMs = rows.length > 1 ? rows[rows.length - 1].t - rows[0].t : 0;
  const shortSpan = spanMs < 2 * 86400000;

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-surface text-sm text-muted" style={{ height }}>
        No weigh-ins to chart yet
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e1e0d9" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => (shortSpan ? fmtTime(new Date(t).toISOString()) : fmtDateShort(t))}
            tick={{ fill: "#898781", fontSize: 11 }}
            axisLine={{ stroke: "#c3c2b7" }}
            tickLine={false}
            tickMargin={6}
            minTickGap={40}
          />
          <YAxis
            width={42}
            domain={[
              (min: number) => Math.max(0, Math.floor((min - 25) / 25) * 25),
              (max: number) => Math.ceil((max + 25) / 25) * 25,
            ]}
            tickFormatter={(v: number) => `${v}g`}
            tick={{ fill: "#898781", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTip kittens={kittens} />} />
          {kittens.map((k) => (
            <Line
              key={k.id}
              dataKey={k.id}
              name={k.name}
              stroke={k.color}
              strokeWidth={2}
              dot={{ r: 2.5, fill: k.color, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "#fcfcfb", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TipProps {
  active?: boolean;
  label?: number;
  payload?: Array<{ dataKey?: unknown; value?: unknown; stroke?: string; name?: string }>;
  kittens: Kitten[];
}

function ChartTip({ active, label, payload, kittens }: TipProps) {
  if (!active || !payload?.length || label === undefined) return null;
  const byId = new Map(kittens.map((k) => [k.id, k]));
  return (
    <div className="rounded-xl border border-hairline bg-surface px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium text-muted">{fmtDateTime(label)}</div>
      {payload.map((p) => {
        const k = byId.get(String(p.dataKey));
        if (!k || typeof p.value !== "number") return null;
        return (
          <div key={k.id} className="flex items-center gap-1.5 py-0.5 text-ink">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: k.color }} />
            <span className="text-ink-2">{k.name}</span>
            <span className="ml-auto pl-3 font-semibold tnum">{p.value} g</span>
          </div>
        );
      })}
    </div>
  );
}

/** Tiny inline weight sparkline (no axes) for dashboard tiles. */
export function Sparkline({ weights, color, width = 96, height = 28 }: { weights: number[]; color: string; width?: number; height?: number }) {
  if (weights.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const pad = 3;
  const points = weights
    .map((w, i) => {
      const x = pad + (i / (weights.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (w - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
