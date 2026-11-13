"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";
import { setLang } from "@/lib/actions/lang";
import { cx } from "@/lib/cx";
import { makeT, type Lang, type T } from "@/lib/i18n/core";
import { formatLongDate, formatShortDate } from "@/lib/domain/dates";

const LangContext = createContext<{ lang: Lang; t: T }>({ lang: "en", t: makeT("en") });

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <LangContext value={value}>{children}</LangContext>;
}

export const useT = () => useContext(LangContext).t;
export const useLang = () => useContext(LangContext).lang;

/** RU / EN toggle. The choice is a cookie, so server-rendered pages follow it. */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (next: Lang) => {
    if (next === lang || pending) return;
    start(async () => {
      await setLang(next);
      router.refresh();
    });
  };
  return (
    <div role="group" aria-label="Language / Язык" className={cx("inline-flex shrink-0 overflow-hidden rounded-full border border-line bg-card text-xs font-medium", pending && "opacity-60", className)}>
      {(["ru", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={lang === l}
          className={cx("h-8 px-2.5 uppercase tracking-wide transition-colors", lang === l ? "bg-forest text-card" : "text-ink-2 hover:bg-paper-deep")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Translated text for components that may render on either side (PageHeader, StatusPill…). */
export function Tx({ children, vars }: { children: string; vars?: Record<string, string | number> }) {
  return useT()(children, vars);
}

/** A calendar date in the viewer's language ("13 Nov" / "13 нояб"). */
export function DateText({ iso, long = false }: { iso: string; long?: boolean }) {
  const lang = useLang();
  return long ? formatLongDate(iso, lang) : formatShortDate(iso, lang);
}
