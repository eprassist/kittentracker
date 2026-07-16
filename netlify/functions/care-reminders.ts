import type { Config } from "@netlify/functions";
import webpush from "web-push";
import { ensureSchema, sql } from "./lib/db.js";

/**
 * Scheduled function: every morning, if any care item is due or overdue,
 * send a push notification to every enrolled phone. Dead subscriptions
 * (uninstalled app, revoked permission) are pruned as we go.
 */
export default async (): Promise<Response> => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.log("care-reminders: VAPID keys not configured, skipping");
    return new Response("skipped");
  }

  await ensureSchema();
  const q = sql();
  const due = await q`
    select s.title, s.next_due, k.name as cat_name from care_schedules s
    join kittens k on k.id = s.cat_id
    where s.next_due <= current_date
    order by s.next_due asc`;
  if (!due.length) return new Response("nothing due");

  const subs = await q`select endpoint, subscription from push_subscriptions`;
  if (!subs.length) return new Response("no subscribers");

  webpush.setVapidDetails("https://kittenwatch.netlify.app", publicKey, privateKey);

  const today = new Date().toISOString().slice(0, 10);
  const lines = due.slice(0, 4).map((d) => {
    const overdue = String(d.next_due).slice(0, 10) < today;
    return `${d.cat_name}: ${d.title}${overdue ? " (overdue)" : ""}`;
  });
  if (due.length > 4) lines.push(`…and ${due.length - 4} more`);
  const payload = JSON.stringify({
    title: `🐾 Care due today (${due.length})`,
    body: lines.join("\n"),
    url: "/care",
  });

  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription, payload);
      sent += 1;
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await q`delete from push_subscriptions where endpoint = ${s.endpoint}`;
      } else {
        console.error("care-reminders: send failed", status, e instanceof Error ? e.message : e);
      }
    }
  }
  console.log(`care-reminders: ${due.length} due, sent to ${sent}/${subs.length} devices`);
  return new Response(`sent ${sent}`);
};

export const config: Config = {
  // 08:00 UTC daily (morning in the UK year-round)
  schedule: "0 8 * * *",
};
