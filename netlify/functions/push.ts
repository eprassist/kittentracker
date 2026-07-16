import type { Config } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { ensureSchema, sql } from "./lib/db.js";
import { err, json } from "./lib/http.js";

/**
 * Web-push subscription management. Each phone that enables reminders stores
 * its PushSubscription here; the daily care-reminders scheduled function
 * sends to all of them.
 */
export default async (req: Request): Promise<Response> => {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { pathname } = new URL(req.url);

  if (pathname === "/api/push/vapid-key" && req.method === "GET") {
    const key = process.env.VAPID_PUBLIC_KEY;
    return json({ key: key ?? null });
  }

  await ensureSchema();
  const q = sql();

  if (pathname === "/api/push/subscriptions") {
    if (req.method === "GET") {
      const rows = await q`select endpoint, label, created_at from push_subscriptions order by created_at asc`;
      return json(rows);
    }
    if (req.method === "POST") {
      const b = (await req.json().catch(() => null)) as Record<string, any> | null;
      const sub = b?.subscription;
      if (!sub || typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://")) {
        return err("Invalid push subscription", 400);
      }
      const label = typeof b?.label === "string" && b.label.trim() ? b.label.trim().slice(0, 80) : null;
      await q`
        insert into push_subscriptions (endpoint, subscription, label)
        values (${sub.endpoint}, ${JSON.stringify(sub)}::jsonb, ${label})
        on conflict (endpoint) do update set subscription = excluded.subscription, label = excluded.label`;
      return json({ ok: true }, 201);
    }
    if (req.method === "DELETE") {
      const b = (await req.json().catch(() => null)) as Record<string, any> | null;
      if (typeof b?.endpoint !== "string") return err("endpoint is required", 400);
      await q`delete from push_subscriptions where endpoint = ${b.endpoint}`;
      return new Response(null, { status: 204 });
    }
  }

  return err("Not found", 404);
};

export const config: Config = {
  path: ["/api/push/vapid-key", "/api/push/subscriptions"],
};
