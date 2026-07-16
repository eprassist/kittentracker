import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Config } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { ensureSchema, sql } from "./lib/db.js";
import { err, json } from "./lib/http.js";

/**
 * Private ICS feed for care schedules. Google Calendar can't send our session
 * cookie, so the feed authenticates with a secret token in the URL instead
 * (derived from the passcode — rotating the passcode rotates the feed URL).
 */
function feedToken(): string {
  const passcode = process.env.HOUSEHOLD_PASSCODE;
  if (!passcode) throw new Error("HOUSEHOLD_PASSCODE is not set");
  return createHmac("sha256", passcode).update("litter-watch-calendar-v1").digest("hex").slice(0, 40);
}

function tokenMatches(candidate: string): boolean {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(feedToken()).digest();
  return timingSafeEqual(a, b);
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // Authenticated helper for the app: returns the subscribe URL to show the user.
  if (url.pathname === "/api/calendar/url") {
    const denied = requireAuth(req);
    if (denied) return denied;
    try {
      return json({ url: `${url.origin}/api/calendar.ics?token=${feedToken()}` });
    } catch (e) {
      return err(e instanceof Error ? e.message : "Calendar unavailable", 500);
    }
  }

  // The feed itself — token-authenticated, fetched by Google's servers.
  if (url.pathname === "/api/calendar.ics" && req.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    try {
      if (!token || !tokenMatches(token)) return err("Invalid token", 401);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Calendar unavailable", 500);
    }
    await ensureSchema();
    const q = sql();
    const rows = await q`
      select s.*, k.name as cat_name from care_schedules s
      join kittens k on k.id = s.cat_id
      order by s.next_due asc`;

    const stamp = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Litter Watch//Care Schedule//EN",
      "X-WR-CALNAME:Litter Watch care",
      "X-WR-CALDESC:Vaccinations and care reminders for the litter",
    ];
    for (const s of rows) {
      const date = String(s.next_due).slice(0, 10).replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${s.id}@litter-watch`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${date}`,
        `SUMMARY:${icsEscape(`🐾 ${s.cat_name}: ${s.title}`)}`,
        ...(s.notes ? [`DESCRIPTION:${icsEscape(s.notes)}`] : []),
        // Recurring schedules repeat from the next due date at their interval.
        ...(s.interval_days ? [`RRULE:FREQ=DAILY;INTERVAL=${s.interval_days}`] : []),
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache",
        "Content-Disposition": 'inline; filename="litter-watch.ics"',
      },
    });
  }

  return err("Not found", 404);
};

export const config: Config = {
  path: ["/api/calendar.ics", "/api/calendar/url"],
};
