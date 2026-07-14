import type { Config } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { ensureSchema, sql } from "./lib/db.js";
import { err, json } from "./lib/http.js";

const DEFAULTS = {
  // Healthy kittens gain roughly 7–15 g/day; flag anything trending below this.
  min_daily_gain: 7,
};

export default async (req: Request): Promise<Response> => {
  const denied = requireAuth(req);
  if (denied) return denied;
  await ensureSchema();
  const q = sql();

  if (req.method === "GET") {
    const rows = await q`select value from settings where key = 'household'`;
    return json({ ...DEFAULTS, ...(rows[0]?.value ?? {}) });
  }

  if (req.method === "PUT") {
    const b = (await req.json().catch(() => null)) as Record<string, any> | null;
    if (!b || typeof b !== "object") return err("Invalid body", 400);
    const minGain = Number(b.min_daily_gain);
    if (!Number.isFinite(minGain) || minGain < 0 || minGain > 100) {
      return err("min_daily_gain must be between 0 and 100", 400);
    }
    const value = { min_daily_gain: minGain };
    await q`
      insert into settings (key, value) values ('household', ${JSON.stringify(value)}::jsonb)
      on conflict (key) do update set value = excluded.value`;
    return json({ ...DEFAULTS, ...value });
  }

  return err("Method not allowed", 405);
};

export const config: Config = {
  path: "/api/settings",
};
