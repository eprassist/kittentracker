import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./Icons";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom-sheet style modal, sized for phones. */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-safe shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted active:bg-page" aria-label="Close">
            <XIcon />
          </button>
        </div>
        <div className="pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
