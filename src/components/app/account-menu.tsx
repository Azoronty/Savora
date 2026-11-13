import { LogOut, Sprout, Telescope, Recycle } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/lib/actions/account";
import type { Viewer } from "@/lib/data/session";
import { LangSwitch } from "@/components/i18n/lang-provider";
import { getT } from "@/lib/i18n/server";

function initials(viewer: Viewer) {
  const source = viewer.displayName || viewer.email || viewer.householdName;
  return source.trim().charAt(0).toUpperCase() || "S";
}

export async function AccountPanel({ viewer }: { viewer: Viewer }) {
  const t = await getT();
  return (
    <div className="space-y-3">
    <LangSwitch />
    <div className="flex items-center gap-3 rounded-lg border border-line bg-card/70 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest-soft font-display text-base text-forest">
        {initials(viewer)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t(viewer.householdName)}</p>
        <p className="truncate text-xs text-muted">{viewer.isAnonymous ? t("Demo guest") : viewer.email}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          aria-label={t("Sign out")}
          title={t("Sign out")}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
    </div>
  );
}

export async function MobileAccountMenu({ viewer }: { viewer: Viewer }) {
  const t = await getT();
  return (
    <details className="group relative">
      <summary
        aria-label={t("Account")}
        className="flex size-10 list-none items-center justify-center rounded-full bg-forest-soft font-display text-base text-forest [&::-webkit-details-marker]:hidden"
      >
        {initials(viewer)}
      </summary>
      <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-line bg-card p-3 shadow-lift animate-fade">
        <p className="truncate text-sm font-medium">{t(viewer.householdName)}</p>
        <p className="truncate text-xs text-muted">{viewer.isAnonymous ? t("Demo guest") : viewer.email}</p>
        <LangSwitch className="mt-3" />
        <Link href="/app/savi" className="mt-3 flex w-full items-center gap-2 rounded-md border-t border-line px-2 py-2 pt-3 text-sm text-ink-2 hover:bg-paper-deep">
          <Sprout className="size-4" aria-hidden="true" /> {t("Savi & missions")}
        </Link>
        <Link href="/app/predict" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-2 hover:bg-paper-deep">
          <Telescope className="size-4" aria-hidden="true" /> {t("Predictive Kitchen")}
        </Link>
        <Link href="/app/waste" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-2 hover:bg-paper-deep">
          <Recycle className="size-4" aria-hidden="true" /> {t("Waste log")}
        </Link>
        <form action={signOut} className="border-t border-line pt-3">
          <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-2 hover:bg-paper-deep">
            <LogOut className="size-4" aria-hidden="true" /> {t("Sign out")}
          </button>
        </form>
      </div>
    </details>
  );
}
