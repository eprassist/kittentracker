import type { Config, Context } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { ensureSchema, sql } from "./lib/db.js";
import { err, json } from "./lib/http.js";
import { deleteMediaForUrls } from "./lib/media-store.js";

export default async (req: Request, context: Context): Promise<Response> => {
  const denied = requireAuth(req);
  if (denied) return denied;
  await ensureSchema();
  const q = sql();
  const id = context.params?.id;

  if (!id && req.method === "GET") {
    const rows = await q`select * from kittens order by archived asc, created_at asc`;
    return json(rows);
  }

  if (!id && req.method === "POST") {
    const b = (await req.json().catch(() => null)) as Record<string, any> | null;
    const name = typeof b?.name === "string" ? b.name.trim() : "";
    if (!name) return err("Name is required", 400);
    const color = typeof b?.color === "string" ? b.color : "#2a78d6";
    const birthDate = b?.birth_date || null;
    const notes = typeof b?.notes === "string" && b.notes.trim() ? b.notes.trim() : null;
    const rows = await q`
      insert into kittens (name, color, birth_date, notes)
      values (${name}, ${color}, ${birthDate}, ${notes})
      returning *`;
    return json(rows[0], 201);
  }

  if (id && req.method === "PUT") {
    const b = (await req.json().catch(() => null)) as Record<string, any> | null;
    if (!b || typeof b !== "object") return err("Invalid body", 400);
    const existing = await q`select * from kittens where id = ${id}`;
    if (!existing.length) return err("Kitten not found", 404);
    const cur = existing[0];
    const merged = {
      name: "name" in b ? String(b.name).trim() : cur.name,
      color: "color" in b ? String(b.color) : cur.color,
      birth_date: "birth_date" in b ? b.birth_date || null : cur.birth_date,
      notes: "notes" in b ? (typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null) : cur.notes,
      archived: "archived" in b ? Boolean(b.archived) : cur.archived,
    };
    if (!merged.name) return err("Name is required", 400);
    const rows = await q`
      update kittens set
        name = ${merged.name},
        color = ${merged.color},
        birth_date = ${merged.birth_date},
        notes = ${merged.notes},
        archived = ${merged.archived}
      where id = ${id}
      returning *`;
    return json(rows[0]);
  }

  if (id && req.method === "DELETE") {
    const media = await q`select photo_url, video_url from weigh_ins where kitten_id = ${id}`;
    const deleted = await q`delete from kittens where id = ${id} returning id`;
    if (!deleted.length) return err("Kitten not found", 404);
    await deleteMediaForUrls(media.flatMap((m: Record<string, unknown>) => [m.photo_url as string | null, m.video_url as string | null]));
    return new Response(null, { status: 204 });
  }

  return err("Method not allowed", 405);
};

export const config: Config = {
  path: ["/api/kittens", "/api/kittens/:id"],
};
