import type { Config } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { ensureSchema, sql } from "./lib/db.js";
import { err, json } from "./lib/http.js";

// Placeholder litter of 4. Loaded on demand from the empty state in the app —
// replace with real kittens any time (sample kittens can be deleted in the app).
const SAMPLE = [
  { name: "Biscuit", color: "#2a78d6", ratePerDay: 13 },
  { name: "Mochi", color: "#1baf7a", ratePerDay: 15 },
  { name: "Pepper", color: "#eda100", ratePerDay: 10 },
  { name: "Clover", color: "#008300", ratePerDay: 3 }, // slow gainer — demos the health flag
];

export default async (req: Request): Promise<Response> => {
  const denied = requireAuth(req);
  if (denied) return denied;
  if (req.method !== "POST") return err("Method not allowed", 405);
  await ensureSchema();
  const q = sql();

  const existing = await q`select count(*)::int as n from kittens`;
  if (existing[0].n > 0) return err("Kittens already exist — sample data can only seed an empty litter", 409);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const birth = new Date(now - 21 * day).toISOString().slice(0, 10);

  for (const [i, s] of SAMPLE.entries()) {
    const kitten = await q`
      insert into kittens (name, color, birth_date, notes)
      values (${s.name}, ${s.color}, ${birth}, ${"Sample kitten — safe to edit or delete"})
      returning id`;
    const kittenId = kitten[0].id;
    // Twice-daily weigh-ins over the past 6 days, trending upward with a little noise.
    const startWeight = 300 + i * 15;
    for (let d = 6; d >= 0; d--) {
      for (const hour of [8, 20]) {
        const when = new Date(now - d * day);
        when.setHours(hour, 0, 0, 0);
        if (when.getTime() > now) continue;
        const elapsedDays = (now - when.getTime()) / day;
        const noise = Math.sin(kittenId.charCodeAt(0) + d * 2 + hour) * 4;
        const weight = Math.round((startWeight + (6.5 - elapsedDays) * s.ratePerDay + noise) * 10) / 10;
        await q`
          insert into weigh_ins (kitten_id, weight_grams, weighed_at, logged_by)
          values (${kittenId}, ${weight}, ${when.toISOString()}, ${"sample"})`;
      }
    }
  }

  return json({ ok: true, kittens: SAMPLE.length }, 201);
};

export const config: Config = {
  path: "/api/seed",
};
