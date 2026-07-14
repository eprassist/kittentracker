// In-memory mock of the Netlify Functions API, used by `npm run dev:demo`.
// Lets the UI run with zero setup (no database, no Netlify CLI).
// Data lives only for the lifetime of the dev server — nothing is saved.
// The real API lives in netlify/functions/ and is used by `netlify dev` and production.
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const DEMO_PASSCODE = "kittens";

interface Kitten {
  id: string;
  name: string;
  color: string;
  birth_date: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
}

interface WeighIn {
  id: string;
  kitten_id: string;
  weight_grams: number;
  weighed_at: string;
  logged_by: string | null;
  photo_url: string | null;
  video_url: string | null;
  notes: string | null;
  created_at: string;
}

const kittens = new Map<string, Kitten>();
const weighIns = new Map<string, WeighIn>();
const media = new Map<string, { ct: string; data: Buffer }>();
const parts = new Map<string, Buffer[]>();
let settings = { min_daily_gain: 7 };

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, data?: unknown) {
  res.statusCode = status;
  if (data === undefined) {
    res.end();
  } else {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  }
}

function authed(req: IncomingMessage): boolean {
  return /(?:^|;\s*)lw_session=demo/.test(req.headers.cookie ?? "");
}

function seedSample() {
  const SAMPLE = [
    { name: "Biscuit", color: "#2a78d6", rate: 13 },
    { name: "Mochi", color: "#1baf7a", rate: 15 },
    { name: "Pepper", color: "#eda100", rate: 10 },
    { name: "Clover", color: "#008300", rate: 3 },
  ];
  const now = Date.now();
  const day = 86400000;
  const birth = new Date(now - 21 * day).toISOString().slice(0, 10);
  for (const [i, s] of SAMPLE.entries()) {
    const id = randomUUID();
    kittens.set(id, {
      id,
      name: s.name,
      color: s.color,
      birth_date: birth,
      notes: "Sample kitten — safe to edit or delete",
      archived: false,
      created_at: new Date().toISOString(),
    });
    for (let d = 6; d >= 0; d--) {
      for (const hour of [8, 20]) {
        const when = new Date(now - d * day);
        when.setHours(hour, 0, 0, 0);
        if (when.getTime() > now) continue;
        const elapsed = (now - when.getTime()) / day;
        const weight = Math.round((300 + i * 15 + (6.5 - elapsed) * s.rate + Math.sin(i + d * 2 + hour) * 4) * 10) / 10;
        const wid = randomUUID();
        weighIns.set(wid, {
          id: wid,
          kitten_id: id,
          weight_grams: weight,
          weighed_at: when.toISOString(),
          logged_by: "sample",
          photo_url: null,
          video_url: null,
          notes: null,
          created_at: new Date().toISOString(),
        });
      }
    }
  }
}

export function mockApi(): Plugin {
  return {
    name: "litter-watch-mock-api",
    configureServer(server) {
      // eslint-disable-next-line no-console
      console.log(`\n  DEMO MODE — in-memory API, data is NOT saved. Passcode: "${DEMO_PASSCODE}"\n`);
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const p = url.pathname;
        if (!p.startsWith("/api/")) return next();
        res.setHeader("x-lw-demo", "1");
        try {
          if (p === "/api/login" && req.method === "POST") {
            const body = JSON.parse((await readBody(req)).toString() || "{}");
            if ((body.passcode ?? "").trim() !== DEMO_PASSCODE) return send(res, 401, { error: "Wrong passcode (demo mode: 'kittens')" });
            res.setHeader("Set-Cookie", "lw_session=demo; Path=/; SameSite=Lax; Max-Age=31536000");
            return send(res, 204);
          }
          if (p === "/api/logout" && req.method === "POST") {
            res.setHeader("Set-Cookie", "lw_session=; Path=/; Max-Age=0");
            return send(res, 204);
          }
          if (p === "/api/session") return authed(req) ? send(res, 200, { ok: true }) : send(res, 401, { error: "Unauthorized" });
          if (!authed(req)) return send(res, 401, { error: "Unauthorized" });

          if (p === "/api/seed" && req.method === "POST") {
            if (kittens.size) return send(res, 409, { error: "Kittens already exist" });
            seedSample();
            return send(res, 201, { ok: true });
          }

          if (p === "/api/settings") {
            if (req.method === "PUT") settings = { ...settings, ...JSON.parse((await readBody(req)).toString()) };
            return send(res, 200, settings);
          }

          const kittenMatch = p.match(/^\/api\/kittens(?:\/([\w-]+))?$/);
          if (kittenMatch) {
            const id = kittenMatch[1];
            if (!id && req.method === "GET") {
              return send(res, 200, [...kittens.values()].sort((a, b) => Number(a.archived) - Number(b.archived) || a.created_at.localeCompare(b.created_at)));
            }
            if (!id && req.method === "POST") {
              const b = JSON.parse((await readBody(req)).toString());
              const k: Kitten = {
                id: randomUUID(),
                name: b.name,
                color: b.color ?? "#2a78d6",
                birth_date: b.birth_date || null,
                notes: b.notes || null,
                archived: false,
                created_at: new Date().toISOString(),
              };
              kittens.set(k.id, k);
              return send(res, 201, k);
            }
            if (id && req.method === "PUT") {
              const cur = kittens.get(id);
              if (!cur) return send(res, 404, { error: "Not found" });
              const b = JSON.parse((await readBody(req)).toString());
              const merged = { ...cur, ...b, id };
              kittens.set(id, merged);
              return send(res, 200, merged);
            }
            if (id && req.method === "DELETE") {
              kittens.delete(id);
              for (const [wid, w] of weighIns) if (w.kitten_id === id) weighIns.delete(wid);
              return send(res, 204);
            }
          }

          const weighMatch = p.match(/^\/api\/weigh-ins(?:\/([\w-]+))?$/);
          if (weighMatch) {
            const id = weighMatch[1];
            if (!id && req.method === "GET") {
              const kid = url.searchParams.get("kitten_id");
              const rows = [...weighIns.values()]
                .filter((w) => !kid || w.kitten_id === kid)
                .sort((a, b) => b.weighed_at.localeCompare(a.weighed_at));
              return send(res, 200, rows);
            }
            if (!id && req.method === "POST") {
              const body = JSON.parse((await readBody(req)).toString());
              const entries = Array.isArray(body.entries) ? body.entries : [body];
              const created = entries.map((e: Partial<WeighIn>) => {
                const w: WeighIn = {
                  id: randomUUID(),
                  kitten_id: e.kitten_id!,
                  weight_grams: Number(e.weight_grams),
                  weighed_at: e.weighed_at ?? new Date().toISOString(),
                  logged_by: e.logged_by ?? null,
                  photo_url: e.photo_url ?? null,
                  video_url: e.video_url ?? null,
                  notes: e.notes ?? null,
                  created_at: new Date().toISOString(),
                };
                weighIns.set(w.id, w);
                return w;
              });
              return send(res, 201, created);
            }
            if (id && req.method === "PUT") {
              const cur = weighIns.get(id);
              if (!cur) return send(res, 404, { error: "Not found" });
              const b = JSON.parse((await readBody(req)).toString());
              const merged = { ...cur, ...b, id, kitten_id: cur.kitten_id };
              weighIns.set(id, merged);
              return send(res, 200, merged);
            }
            if (id && req.method === "DELETE") {
              weighIns.delete(id);
              return send(res, 204);
            }
          }

          if (p === "/api/media" && req.method === "POST") {
            const data = await readBody(req);
            const id = randomUUID();
            media.set(id, { ct: req.headers["content-type"] ?? "application/octet-stream", data });
            return send(res, 201, { url: `/api/media/${id}` });
          }
          const partMatch = p.match(/^\/api\/media\/part\/([\w-]+)\/(\d+)$/);
          if (partMatch && req.method === "POST") {
            const arr = parts.get(partMatch[1]) ?? [];
            arr[Number(partMatch[2])] = await readBody(req);
            parts.set(partMatch[1], arr);
            return send(res, 200, { ok: true });
          }
          if (p === "/api/media/finish" && req.method === "POST") {
            const b = JSON.parse((await readBody(req)).toString());
            media.set(b.id, { ct: b.contentType, data: Buffer.concat(parts.get(b.id) ?? []) });
            parts.delete(b.id);
            return send(res, 201, { url: `/api/media/${b.id}` });
          }
          const mediaMatch = p.match(/^\/api\/media\/([\w-]+)$/);
          if (mediaMatch && req.method === "GET") {
            const m = media.get(mediaMatch[1]);
            if (!m) return send(res, 404, { error: "Not found" });
            res.statusCode = 200;
            res.setHeader("Content-Type", m.ct);
            res.setHeader("Accept-Ranges", "bytes");
            return res.end(m.data);
          }

          return send(res, 404, { error: "Not found" });
        } catch (e) {
          return send(res, 500, { error: e instanceof Error ? e.message : "Mock API error" });
        }
      });
    },
  };
}
