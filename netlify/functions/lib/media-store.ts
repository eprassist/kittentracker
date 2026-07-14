import { getStore } from "@netlify/blobs";

export const CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB — stays under Netlify's request body limit
export const MAX_PARTS = 25; // 25 × 4 MB = 100 MB max video
export const MAX_SINGLE_BYTES = CHUNK_BYTES;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function mediaStore() {
  return getStore("litter-media");
}

export function fileKey(id: string): string {
  return `f/${id}`;
}

export function partKey(id: string, index: number): string {
  return `p/${id}/${String(index).padStart(3, "0")}`;
}

/** Extracts the media id from a stored URL like "/api/media/<uuid>". */
export function mediaIdFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/\/api\/media\/([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

/** Deletes a media file and any chunk parts. Best-effort; ignores missing blobs. */
export async function deleteMedia(id: string): Promise<void> {
  const store = mediaStore();
  await store.delete(fileKey(id)).catch(() => {});
  try {
    const { blobs } = await store.list({ prefix: `p/${id}/` });
    await Promise.all(blobs.map((b) => store.delete(b.key).catch(() => {})));
  } catch {
    // best-effort cleanup
  }
}

export async function deleteMediaForUrls(urls: Array<string | null | undefined>): Promise<void> {
  const ids = urls.map(mediaIdFromUrl).filter((x): x is string => !!x);
  await Promise.all(ids.map(deleteMedia));
}
