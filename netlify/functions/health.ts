import type { Config } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { ensureSchema, sql } from "./lib/db.js";
import { err, json } from "./lib/http.js";

export const CARE_TYPE_VALUES = ["vaccination", "flea_worm", "dental", "vet_visit", "medication", "grooming", "other"];

function opt(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function validDate(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return Number.isNaN(new Date(`${v}T00:00:00`).getTime()) ? null : v;
}

export default async (req: Request): Promise<Response> => {
  const denied = requireAuth(req);
  if (denied) return denied;
  await ensureSchema();
  const q = sql();
  const { pathname, searchParams } = new URL(req.url);
  const segs = pathname.split("/").filter(Boolean); // ["api", "health-records"|"schedules", id?, "done"?]
  const resource = segs[1];
  const id = segs[2];
  const action = segs[3];

  if (resource === "health-records") {
    if (!id && req.method === "GET") {
      const catId = searchParams.get("cat_id");
      const rows = await q`
        select * from health_records
        where (${catId}::uuid is null or cat_id = ${catId}::uuid)
        order by happened_on desc, created_at desc`;
      return json(rows);
    }
    if (!id && req.method === "POST") {
      const b = (await req.json().catch(() => null)) as Record<string, any> | null;
      const title = opt(b?.title);
      const happenedOn = validDate(b?.happened_on);
      if (!b?.cat_id || !title || !happenedOn) return err("cat_id, title and happened_on (YYYY-MM-DD) are required", 400);
      const type = CARE_TYPE_VALUES.includes(b.type) ? b.type : "other";
      const rows = await q`
        insert into health_records (cat_id, type, title, happened_on, notes)
        values (${b.cat_id}, ${type}, ${title}, ${happenedOn}, ${opt(b.notes)})
        returning *`;
      return json(rows[0], 201);
    }
    if (id && req.method === "PUT") {
      const b = (await req.json().catch(() => null)) as Record<string, any> | null;
      if (!b) return err("Invalid body", 400);
      const cur = (await q`select * from health_records where id = ${id}`)[0];
      if (!cur) return err("Record not found", 404);
      const title = "title" in b ? opt(b.title) : cur.title;
      const happenedOn = "happened_on" in b ? validDate(b.happened_on) : cur.happened_on;
      if (!title || !happenedOn) return err("title and happened_on are required", 400);
      const type = "type" in b && CARE_TYPE_VALUES.includes(b.type) ? b.type : cur.type;
      const notes = "notes" in b ? opt(b.notes) : cur.notes;
      const rows = await q`
        update health_records set type = ${type}, title = ${title}, happened_on = ${happenedOn}, notes = ${notes}
        where id = ${id} returning *`;
      return json(rows[0]);
    }
    if (id && req.method === "DELETE") {
      const rows = await q`delete from health_records where id = ${id} returning id`;
      return rows.length ? new Response(null, { status: 204 }) : err("Record not found", 404);
    }
  }

  if (resource === "schedules") {
    if (!id && req.method === "GET") {
      const rows = await q`select * from care_schedules order by next_due asc, created_at asc`;
      return json(rows);
    }
    if (!id && req.method === "POST") {
      const b = (await req.json().catch(() => null)) as Record<string, any> | null;
      const title = opt(b?.title);
      const nextDue = validDate(b?.next_due);
      if (!b?.cat_id || !title || !nextDue) return err("cat_id, title and next_due (YYYY-MM-DD) are required", 400);
      const type = CARE_TYPE_VALUES.includes(b.type) ? b.type : "other";
      const interval = Number.isInteger(b.interval_days) && b.interval_days > 0 && b.interval_days <= 3660 ? b.interval_days : null;
      const rows = await q`
        insert into care_schedules (cat_id, type, title, interval_days, next_due, notes)
        values (${b.cat_id}, ${type}, ${title}, ${interval}, ${nextDue}, ${opt(b.notes)})
        returning *`;
      return json(rows[0], 201);
    }
    if (id && action === "done" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as Record<string, any>;
      const cur = (await q`select * from care_schedules where id = ${id}`)[0];
      if (!cur) return err("Schedule not found", 404);
      const doneOn = validDate(b?.done_on) ?? new Date().toISOString().slice(0, 10);
      // Log it in the cat's health history…
      await q`
        insert into health_records (cat_id, type, title, happened_on, notes)
        values (${cur.cat_id}, ${cur.type}, ${cur.title}, ${doneOn}, ${cur.notes})`;
      // …then roll the schedule forward (or retire a one-off).
      if (cur.interval_days) {
        const next = new Date(`${doneOn}T00:00:00`);
        next.setDate(next.getDate() + cur.interval_days);
        const rows = await q`
          update care_schedules set next_due = ${next.toISOString().slice(0, 10)}
          where id = ${id} returning *`;
        return json({ schedule: rows[0], completed: true });
      }
      await q`delete from care_schedules where id = ${id}`;
      return json({ schedule: null, completed: true });
    }
    if (id && !action && req.method === "PUT") {
      const b = (await req.json().catch(() => null)) as Record<string, any> | null;
      if (!b) return err("Invalid body", 400);
      const cur = (await q`select * from care_schedules where id = ${id}`)[0];
      if (!cur) return err("Schedule not found", 404);
      const title = "title" in b ? opt(b.title) : cur.title;
      const nextDue = "next_due" in b ? validDate(b.next_due) : cur.next_due;
      if (!title || !nextDue) return err("title and next_due are required", 400);
      const type = "type" in b && CARE_TYPE_VALUES.includes(b.type) ? b.type : cur.type;
      const interval =
        "interval_days" in b
          ? Number.isInteger(b.interval_days) && b.interval_days > 0 && b.interval_days <= 3660
            ? b.interval_days
            : null
          : cur.interval_days;
      const notes = "notes" in b ? opt(b.notes) : cur.notes;
      const rows = await q`
        update care_schedules set type = ${type}, title = ${title}, interval_days = ${interval}, next_due = ${nextDue}, notes = ${notes}
        where id = ${id} returning *`;
      return json(rows[0]);
    }
    if (id && !action && req.method === "DELETE") {
      const rows = await q`delete from care_schedules where id = ${id} returning id`;
      return rows.length ? new Response(null, { status: 204 }) : err("Schedule not found", 404);
    }
  }

  return err("Not found", 404);
};

export const config: Config = {
  path: [
    "/api/health-records",
    "/api/health-records/:id",
    "/api/schedules",
    "/api/schedules/:id",
    "/api/schedules/:id/done",
  ],
};
