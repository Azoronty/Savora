"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { useT } from "@/components/i18n/lang-provider";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
};

/**
 * Modal panel built on the native <dialog> element (focus trap, Esc and
 * inert background for free). Slides up from the bottom on phones and in from
 * the right on larger screens.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = "md" }: SheetProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="sheet-title"
      className={cx(
        "fixed m-0 max-h-none max-w-none bg-transparent p-0 text-ink backdrop:animate-fade",
        "inset-x-0 bottom-0 top-auto w-full sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh",
        size === "lg" ? "sm:w-[36rem]" : "sm:w-[30rem]",
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col rounded-t-xl border border-line bg-card shadow-lift animate-rise sm:h-full sm:max-h-none sm:rounded-none sm:border-y-0 sm:border-r-0">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
            <div className="min-w-0">
              <h2 id="sheet-title" className="text-[1.6rem] font-medium leading-tight">
                {t(title)}
              </h2>
              {description && <div className="mt-1 text-sm text-muted">{typeof description === "string" ? t(description) : description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("Close")}
              className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-paper-deep hover:text-ink"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-line bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-7">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
