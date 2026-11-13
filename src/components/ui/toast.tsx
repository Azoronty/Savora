"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/actions/result";
import { useT } from "@/components/i18n/lang-provider";

type Toast = { id: number; tone: "success" | "error"; message: string };
type ToastApi = { notify: (message: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const t = useT();

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { id, tone, message: t(message) }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss, t],
  );
  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-forest-deep/10 bg-forest-deep px-4 py-3 text-sm text-card shadow-lift animate-rise"
          >
            {toast.tone === "error" ? (
              <CircleAlert className="mt-px size-[18px] shrink-0 text-[#f0a48f]" aria-hidden="true" />
            ) : (
              <CircleCheck className="mt-px size-[18px] shrink-0 text-[#a9c7a5]" aria-hidden="true" />
            )}
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-m-1 rounded p-1 text-card/70 hover:text-card"
              aria-label={t("Dismiss")}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/**
 * Runs a Server Action inside a transition and reports the outcome as a toast.
 * Returns the result so callers can react (close a sheet, show field errors).
 */
export function useAction() {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, { quiet = false } = {}) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          let result: ActionResult<T>;
          try {
            result = await action();
          } catch (error) {
            // Redirects thrown by actions must propagate to the router.
            if (error instanceof Error && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
            result = { ok: false, error: "We couldn't reach the server. Check your connection and try again." };
          }
          if (!result.ok) notify(result.error, "error");
          else if (result.message && !quiet) notify(result.message);
          resolve(result);
        });
      }),
    [notify],
  );

  return { run, pending };
}
