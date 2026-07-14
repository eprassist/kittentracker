import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WeighIn } from "../lib/types";
import { PlayIcon, XIcon } from "./Icons";

export interface MediaItem {
  kind: "photo" | "video";
  url: string;
}

export function mediaItems(w: Pick<WeighIn, "photo_url" | "video_url">): MediaItem[] {
  const items: MediaItem[] = [];
  if (w.photo_url) items.push({ kind: "photo", url: w.photo_url });
  if (w.video_url) items.push({ kind: "video", url: w.video_url });
  return items;
}

/** Square media thumbnail. Pass size={0} to fill the parent grid cell instead. */
export function MediaThumb({ item, size = 56, onClick }: { item: MediaItem; size?: number; onClick?: () => void }) {
  const fill = size === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 overflow-hidden rounded-lg bg-hairline ${fill ? "aspect-square w-full" : ""}`}
      style={fill ? undefined : { width: size, height: size }}
      aria-label={item.kind === "photo" ? "View photo" : "Play video"}
    >
      {item.kind === "photo" ? (
        <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <>
          {/* preload=metadata paints the first frame as a poster on iOS */}
          <video src={item.url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
            <PlayIcon width={20} height={20} />
          </span>
        </>
      )}
    </button>
  );
}

export function MediaViewer({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 mt-safe rounded-full bg-white/15 p-2.5 text-white backdrop-blur"
      >
        <XIcon />
      </button>
      {item.kind === "photo" ? (
        <img src={item.url} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={item.url} controls autoPlay playsInline className="max-h-full max-w-full" />
      )}
    </div>,
    document.body,
  );
}

/** Hook: manage a viewer for a tapped media item. */
export function useMediaViewer() {
  const [item, setItem] = useState<MediaItem | null>(null);
  const viewer = item ? <MediaViewer item={item} onClose={() => setItem(null)} /> : null;
  return { open: setItem, viewer };
}
