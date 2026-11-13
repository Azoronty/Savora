"use client";

import { CalendarCheck, CookingPot, Hourglass, LayoutDashboard, Plus, Refrigerator, ShoppingBasket, Recycle, Sprout, Telescope } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cx } from "@/lib/cx";
import { useProductSheet } from "./product-sheet";
import { useT } from "@/components/i18n/lang-provider";

const NAV = [
  { href: "/app", label: "Today", icon: LayoutDashboard, mobile: true },
  { href: "/app/inventory", label: "Inventory", icon: Refrigerator, mobile: true },
  { href: "/app/expiring", label: "Use soon", icon: Hourglass, mobile: false },
  { href: "/app/plan", label: "Rescue plan", short: "Plan", icon: CalendarCheck, mobile: true },
  { href: "/app/meals", label: "Meals", icon: CookingPot, mobile: true },
  { href: "/app/shopping", label: "Shopping", icon: ShoppingBasket, mobile: true },
  { href: "/app/waste", label: "Waste log", icon: Recycle, mobile: false }, // phones: via the Today stat card
  { href: "/app/predict", label: "Predictive", icon: Telescope, mobile: false },
  { href: "/app/savi", label: "Savi", icon: Sprout, mobile: false },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function SidebarNav({ counts }: { counts: { attention: number; shopping: number } }) {
  const pathname = usePathname();
  const { openNew } = useProductSheet();
  const t = useT();
  const badge: Record<string, number> = { "/app/expiring": counts.attention, "/app/shopping": counts.shopping };

  return (
    <nav data-main-nav aria-label={t("Main")} className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => openNew()}
        className="mb-5 flex h-11 items-center gap-2.5 whitespace-nowrap rounded-lg bg-forest px-4 text-[0.9375rem] font-medium text-card shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] transition-colors hover:bg-forest-deep"
      >
        <Plus className="size-[18px]" aria-hidden="true" />
        {t("Add product")}
        <kbd className="ml-auto hidden rounded border border-card/20 px-1.5 font-mono text-[0.65rem] text-card/70 xl:inline">N</kbd>
      </button>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "group flex h-10 items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors",
              active ? "bg-card font-medium text-ink shadow-soft" : "text-ink-2 hover:bg-paper-deep hover:text-ink",
            )}
          >
            <Icon className={cx("size-[18px]", active ? "text-forest-mid" : "text-muted group-hover:text-ink-2")} aria-hidden="true" />
            {t(label)}
            {badge[href] > 0 && (
              <span
                className={cx(
                  "ml-auto min-w-6 rounded-full px-1.5 text-center font-mono text-[0.7rem] leading-5 tabular",
                  href === "/app/expiring" ? "bg-soon-soft text-soon" : "bg-paper-deep text-ink-2",
                )}
              >
                {badge[href]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav
      data-main-nav
      aria-label={t("Main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.filter((n) => n.mobile).map(({ href, label, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-forest" : "text-muted",
                )}
              >
                <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-forest-soft")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate px-0.5">{t(short ?? label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileAddButton() {
  const { openNew } = useProductSheet();
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => openNew()}
      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-forest pl-3 pr-4 text-sm font-medium text-card"
    >
      <Plus className="size-4" aria-hidden="true" />
      {t("Add")}
    </button>
  );
}

/** Press "N" anywhere (outside form fields and dialogs) to add a product. */
export function AddShortcut() {
  const { openNew } = useProductSheet();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable], dialog[open]")) return;
      e.preventDefault();
      openNew();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openNew]);
  return null;
}
