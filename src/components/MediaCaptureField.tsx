import { useEffect, useRef, useState } from "react";
import { MAX_VIDEO_MB } from "../lib/media";
import { CameraIcon, ImageIcon, PlayIcon, XIcon } from "./Icons";

export interface PendingMedia {
  photo?: File;
  video?: File;
}

interface Props {
  value: PendingMedia;
  onChange: (v: PendingMedia) => void;
  compact?: boolean;
}

/**
 * Photo/video attachment picker. "Camera" opens the device camera directly
 * (capture attribute); "Library" opens the photo picker. One photo and one
 * video max per weigh-in — picking another replaces it.
 */
export function MediaCaptureField({ value, onChange, compact }: Props) {
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(files: FileList | null) {
    setError(null);
    const file = files?.[0];
    if (!file) return;
    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`Video is too big (max ${MAX_VIDEO_MB} MB) — try a shorter clip`);
        return;
      }
      onChange({ ...value, video: file });
    } else if (file.type.startsWith("image/")) {
      onChange({ ...value, photo: file });
    } else {
      setError("Only photos and videos are supported");
    }
  }

  const buttonCls =
    "flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink-2 active:bg-page";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={camRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={libRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
        <button type="button" className={buttonCls} onClick={() => camRef.current?.click()}>
          <CameraIcon width={18} height={18} />
          {!compact && "Camera"}
        </button>
        <button type="button" className={buttonCls} onClick={() => libRef.current?.click()}>
          <ImageIcon width={18} height={18} />
          {!compact && "Library"}
        </button>
        {value.photo && (
          <Preview file={value.photo} kind="photo" onRemove={() => onChange({ ...value, photo: undefined })} />
        )}
        {value.video && (
          <Preview file={value.video} kind="video" onRemove={() => onChange({ ...value, video: undefined })} />
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-bad">{error}</p>}
    </div>
  );
}

function Preview({ file, kind, onRemove }: { file: File; kind: "photo" | "video"; onRemove: () => void }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <span className="relative inline-block">
      <span className="block h-11 w-11 overflow-hidden rounded-lg bg-hairline">
        {url &&
          (kind === "photo" ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="relative block h-full w-full">
              <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                <PlayIcon width={14} height={14} />
              </span>
            </span>
          ))}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${kind}`}
        className="absolute -top-1.5 -right-1.5 rounded-full bg-ink p-0.5 text-white"
      >
        <XIcon width={12} height={12} strokeWidth={2.5} />
      </button>
    </span>
  );
}
