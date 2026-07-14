import type { Config } from "@netlify/functions";
import { clearSessionCookie, isAuthed, passcodeMatches, sessionCookie } from "./lib/auth.js";
import { err, json } from "./lib/http.js";

export default async (req: Request): Promise<Response> => {
  const { pathname } = new URL(req.url);

  if (pathname === "/api/login" && req.method === "POST") {
    if (!process.env.HOUSEHOLD_PASSCODE) {
      return err("Server is missing the HOUSEHOLD_PASSCODE environment variable", 500);
    }
    const body = (await req.json().catch(() => null)) as { passcode?: unknown } | null;
    const candidate = typeof body?.passcode === "string" ? body.passcode.trim() : "";
    if (!candidate || !passcodeMatches(candidate)) {
      return err("Wrong passcode", 401);
    }
    return new Response(null, { status: 204, headers: { "Set-Cookie": sessionCookie(req) } });
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } });
  }

  if (pathname === "/api/session" && req.method === "GET") {
    try {
      return isAuthed(req) ? json({ ok: true }) : err("Unauthorized", 401);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Auth misconfigured", 500);
    }
  }

  return err("Not found", 404);
};

export const config: Config = {
  path: ["/api/login", "/api/logout", "/api/session"],
};
