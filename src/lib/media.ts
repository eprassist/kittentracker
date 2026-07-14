import imageCompression from "browser-image-compression";

const CHUNK_BYTES = 4 * 1024 * 1024;
export const MAX_VIDEO_MB = 100;

/** Resize/compress a photo client-side before upload (~1600px, ≤0.5 MB JPEG). */
export async function prepareImage(file: File): Promise<Blob> {
  try {
    return await imageCompression(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 0.5,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.8,
    });
  } catch {
    // If compression fails (e.g. unsupported format), fall back to the original
    // as long as it fits a single-shot upload.
    if (file.size <= CHUNK_BYTES) return file;
    throw new Error("Couldn't process this image — try a different photo");
  }
}

function xhrUpload(
  method: string,
  url: string,
  body: Blob | string,
  contentType: string,
  onProgress?: (loaded: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open(method, url);
    x.setRequestHeader("Content-Type", contentType);
    x.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded);
    };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) {
        resolve(x.responseText ? JSON.parse(x.responseText) : undefined);
      } else {
        let message = `Upload failed (${x.status})`;
        try {
          message = JSON.parse(x.responseText).error ?? message;
        } catch {
          // keep default
        }
        reject(new Error(message));
      }
    };
    x.onerror = () => reject(new Error("Network error during upload"));
    x.send(body);
  });
}

/**
 * Uploads a photo/video to the media API and returns its URL.
 * Small files go in one request; larger ones are split into 4 MB chunks
 * (Netlify Functions cap request bodies, so big videos must be chunked).
 */
export async function uploadMedia(
  blob: Blob,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  if (blob.size <= CHUNK_BYTES) {
    const r = (await xhrUpload("POST", "/api/media", blob, contentType, (loaded) =>
      onProgress?.(loaded / blob.size),
    )) as { url: string };
    return r.url;
  }

  const id = crypto.randomUUID();
  const parts = Math.ceil(blob.size / CHUNK_BYTES);
  for (let i = 0; i < parts; i++) {
    const start = i * CHUNK_BYTES;
    const part = blob.slice(start, Math.min(start + CHUNK_BYTES, blob.size));
    await xhrUpload("POST", `/api/media/part/${id}/${i}`, part, "application/octet-stream", (loaded) =>
      onProgress?.((start + loaded) / blob.size),
    );
  }
  const r = (await xhrUpload(
    "POST",
    "/api/media/finish",
    JSON.stringify({ id, parts, size: blob.size, contentType }),
    "application/json",
  )) as { url: string };
  onProgress?.(1);
  return r.url;
}
