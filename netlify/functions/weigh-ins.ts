import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { ensureSchema, sql } from "./lib/db.js";
import { err, json } from "./lib/http.js";
import { deleteMediaForUrls } from "./lib/media-store.js";

interface WeighInInput {
  kitten_id: string;
  weight_grams: number;
  weighed_at?: string;
  logged_by?: string | null;
  photo_url?: string | null;
  video_url?: string | null;
  notes?: string | null;
}

function validateEntry(e: unknown): WeighInInput | string {
  const b = e as Record<string, unknown>;
  if (!b || typeof b !== "object") return "Invalid entry";
  if (typeof b.kitten_id !== "string" || !b.kitten_id) return "kitten_id is required";
  const weight = Number(b.weight_grams);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 20000) return "weight_grams must be a positive number";
  const weighedAt = b.weighed_at ? new Date(String(b.weighed_at)) : new Date();
  if (Number.isNaN(weighedAt.getTime())) return "weighed_at is not a valid date";
  const opt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    kitten_id: b.kitten_id,
    weight_grams: Math.round(weight * 10) / 10,
    weighed_at: weighedAt.toISOString(),
    logged_by: opt(b.logged_by),
    photo_url: opt(b.photo_url),
    video_url: opt(b.video_url),
    notes: opt(b.notes),
  };
}

export default async (req: Request, context: Context): Promise<Response> => {
  const denied = requireAuth(req);
  if (denied) return denied;
  await ensureSchema();
  const q = sql();
  const id = context.params?.id;
  const url = new URL(req.url);

  if (!id && req.method === "GET") {
    const kittenId = url.searchParams.get("kitten_id");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 2000, 5000);
    const rows = await q`
      select * from weigh_ins
      where (${kittenId}::uuid is null or kitten_id = ${kittenId}::uuid)
      order by weighed_at desc
      limit ${limit}`;
    return json(rows);
  }

  if (!id && req.method === "POST") {
    const body = (await req.json().catch(() => null)) as Record<string, any> | null;
    const rawEntries: unknown[] = Array.isArray(body?.entries) ? body.entries : [body];
    if (!rawEntries.length) return err("No entries provided", 400);
    const entries: WeighInInput[] = [];
    for (const raw of rawEntries) {
      const v = validateEntry(raw);
      if (typeof v === "string") return err(v, 400);
      entries.push(v);
    }
    const created = [];
    for (const e of entries) {
      const rows = await q`
        insert into weigh_ins (kitten_id, weight_grams, weighed_at, logged_by, photo_url, video_url, notes)
        values (${e.kitten_id}, ${e.weight_grams}, ${e.weighed_at}, ${e.logged_by}, ${e.photo_url}, ${e.video_url}, ${e.notes})
        returning *`;
      created.push(rows[0]);
    }
    return json(created, 201);
  }

  if (id && req.method === "PUT") {
    const b = (await req.json().catch(() => null)) as Record<string, any> | null;
    if (!b || typeof b !== "object") return err("Invalid body", 400);
    const existing = await q`select * from weigh_ins where id = ${id}`;
    if (!existing.length) return err("Weigh-in not found", 404);
    const cur = existing[0];
    const patch = { ...cur, ...b, id: cur.id, kitten_id: cur.kitten_id };
    const v = validateEntry(patch);
    if (typeof v === "string") return err(v, 400);
    const rows = await q`
      update weigh_ins set
        weight_grams = ${v.weight_grams},
        weighed_at = ${v.weighed_at},
        logged_by = ${v.logged_by},
        notes = ${v.notes}
      where id = ${id}
      returning *`;
    return json(rows[0]);
  }

  if (id && req.method === "DELETE") {
    const rows = await q`delete from weigh_ins where id = ${id} returning photo_url, video_url`;
    if (!rows.length) return err("Weigh-in not found", 404);
    await deleteMediaForUrls([rows[0].photo_url, rows[0].video_url]);
    return new Response(null, { status: 204 });
  }

  return err("Method not allowed", 405);
};

export const config: Config = {
  path: ["/api/weigh-ins", "/api/weigh-ins/:id"],
};
