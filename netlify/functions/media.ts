import { randomUUID } from "node:crypto";
import type { Config } from "@netlify/functions";
import { requireAuth } from "./lib/auth.js";
import { err, json } from "./lib/http.js";
import {
  CHUNK_BYTES,
  MAX_PARTS,
  MAX_SINGLE_BYTES,
  UUID_RE,
  fileKey,
  mediaStore,
  partKey,
} from "./lib/media-store.js";

interface MediaMeta {
  ct: string;
  size: number;
  parts?: number; // present only for chunked files
}

function isAllowedType(ct: string): boolean {
  return /^(image|video)\//.test(ct);
}

interface ByteRange {
  start: number;
  end: number; // inclusive
}

function parseRange(header: string | null, size: number): ByteRange | "invalid" | null {
  if (!header) return null;
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return "invalid";
  let start: number;
  let end: number;
  if (m[1]) {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  } else {
    // suffix range: last N bytes
    const suffix = Math.min(Number(m[2]), size);
    start = size - suffix;
    end = size - 1;
  }
  if (start >= size || start > end) return "invalid";
  return { start, end };
}

/** Streams a byte range of a chunked upload by pulling 4 MB parts on demand. */
function chunkedStream(id: string, range: ByteRange): ReadableStream<Uint8Array> {
  const store = mediaStore();
  let partIndex = Math.floor(range.start / CHUNK_BYTES);
  let offset = range.start - partIndex * CHUNK_BYTES;
  let remaining = range.end - range.start + 1;
  return new ReadableStream({
    async pull(controller) {
      if (remaining <= 0) {
        controller.close();
        return;
      }
      const buf = (await store.get(partKey(id, partIndex), { type: "arrayBuffer" })) as ArrayBuffer | null;
      if (!buf) {
        controller.error(new Error(`Missing media part ${partIndex} for ${id}`));
        return;
      }
      const len = Math.min(buf.byteLength - offset, remaining);
      controller.enqueue(new Uint8Array(buf, offset, len));
      remaining -= len;
      offset = 0;
      partIndex += 1;
    },
  });
}

async function handleGet(req: Request, id: string): Promise<Response> {
  if (!UUID_RE.test(id)) return err("Bad media id", 400);
  const store = mediaStore();
  const found = await store.getWithMetadata(fileKey(id), { type: "arrayBuffer" });
  if (!found) return err("Not found", 404);
  const meta = found.metadata as unknown as MediaMeta;
  const size = Number(meta.size);
  const range = parseRange(req.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const headers: Record<string, string> = {
    "Content-Type": meta.ct || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
  };
  const effective: ByteRange = range ?? { start: 0, end: size - 1 };
  headers["Content-Length"] = String(effective.end - effective.start + 1);
  if (range) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
  const status = range ? 206 : 200;

  if (req.method === "HEAD") return new Response(null, { status, headers });

  let body: ReadableStream<Uint8Array> | ArrayBuffer;
  if (meta.parts) {
    body = chunkedStream(id, effective);
  } else {
    const data = found.data as ArrayBuffer;
    body = range ? data.slice(range.start, range.end + 1) : data;
  }
  return new Response(body, { status, headers });
}

export default async (req: Request): Promise<Response> => {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { pathname } = new URL(req.url);
  // pathname is one of: /api/media, /api/media/:id, /api/media/part/:id/:index, /api/media/finish
  const rest = pathname.replace(/^\/api\/media\/?/, "").split("/").filter(Boolean);
  const store = mediaStore();

  // Single-shot upload (files <= 4 MB): raw body, Content-Type header
  if (rest.length === 0 && req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (!isAllowedType(ct)) return err("Only image/* or video/* uploads are allowed", 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return err("Empty upload", 400);
    if (buf.byteLength > MAX_SINGLE_BYTES) return err("File too large for single upload — use chunked upload", 413);
    const id = randomUUID();
    const meta: MediaMeta = { ct, size: buf.byteLength };
    await store.set(fileKey(id), buf, { metadata: meta as unknown as Record<string, unknown> });
    return json({ url: `/api/media/${id}` }, 201);
  }

  // Chunk upload: POST /api/media/part/:id/:index
  if (rest[0] === "part" && rest.length === 3 && req.method === "POST") {
    const id = rest[1];
    const index = Number(rest[2]);
    if (!UUID_RE.test(id)) return err("Bad upload id", 400);
    if (!Number.isInteger(index) || index < 0 || index >= MAX_PARTS) {
      return err(`Chunk index out of range (max ${MAX_PARTS} parts)`, 400);
    }
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > CHUNK_BYTES) return err("Bad chunk size", 400);
    await store.set(partKey(id, index), buf);
    return json({ ok: true });
  }

  // Finalize chunked upload: POST /api/media/finish
  if (rest[0] === "finish" && req.method === "POST") {
    const b = (await req.json().catch(() => null)) as Record<string, any> | null;
    const id = typeof b?.id === "string" ? b.id : "";
    const parts = Number(b?.parts);
    const size = Number(b?.size);
    const ct = typeof b?.contentType === "string" ? b.contentType : "";
    if (!UUID_RE.test(id)) return err("Bad upload id", 400);
    if (!isAllowedType(ct)) return err("Only image/* or video/* uploads are allowed", 415);
    if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) return err("Bad part count", 400);
    if (!Number.isFinite(size) || size <= (parts - 1) * CHUNK_BYTES || size > parts * CHUNK_BYTES) {
      return err("Size does not match part count", 400);
    }
    // Sanity check: the last part must exist before we publish the manifest.
    const lastPart = await store.getMetadata(partKey(id, parts - 1));
    if (!lastPart) return err("Upload incomplete — missing final chunk", 400);
    const meta: MediaMeta = { ct, size, parts };
    await store.set(fileKey(id), JSON.stringify({ v: 1 }), {
      metadata: meta as unknown as Record<string, unknown>,
    });
    return json({ url: `/api/media/${id}` }, 201);
  }

  // Download: GET/HEAD /api/media/:id
  if (rest.length === 1 && (req.method === "GET" || req.method === "HEAD")) {
    return handleGet(req, rest[0]);
  }

  return err("Not found", 404);
};

export const config: Config = {
  path: ["/api/media", "/api/media/*"],
};
