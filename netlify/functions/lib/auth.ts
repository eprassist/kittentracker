import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { err } from "./http.js";

const COOKIE_NAME = "lw_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function passcode(): string {
  const p = process.env.HOUSEHOLD_PASSCODE;
  if (!p) throw new Error("HOUSEHOLD_PASSCODE environment variable is not set");
  return p;
}

function sessionToken(): string {
  return createHmac("sha256", passcode()).update("litter-watch-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  // Hash both sides so inputs of different lengths can be compared in constant time.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passcodeMatches(candidate: string): boolean {
  return safeEqual(candidate, passcode());
}

export function isAuthed(req: Request): boolean {
  const cookies = req.headers.get("cookie") ?? "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  return safeEqual(match[1], sessionToken());
}

/** Returns a 401 Response if the request lacks a valid session cookie, else null. */
export function requireAuth(req: Request): Response | null {
  try {
    if (isAuthed(req)) return null;
  } catch (e) {
    return err(e instanceof Error ? e.message : "Auth misconfigured", 500);
  }
  return err("Unauthorized", 401);
}

export function sessionCookie(req: Request): string {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${sessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
