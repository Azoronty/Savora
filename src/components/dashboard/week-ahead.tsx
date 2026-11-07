import Link from "next/link";
import { addDays, formatShortDate } from "@/lib/domain/dates";
import { getExpiry } from "@/lib/domain/expiry";
import type { Product } from "@/lib/data/queries";
import { cx } from "@/lib/cx";
import { StatusDot } from "@/components/ui/status";

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/**
 * The signature view: the next seven days as columns, each listing what
 * reaches its date that day. Past-date items gather in a leading column.
 */
export function WeekAhead({ products, today }: { products: Product[]; today: string }) {
  const overdue = products.filter((p) => p.expires_on < today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    return { date, items: products.filter((p) => p.expires_on === date) };
  });
  const columns = [
    ...(overdue.length ? [{ key: "overdue", label: "Past date", sub: `${overdue.length} to check`, items: overdue, tone: "expired" as const }] : []),
    ...days.map((d, i) => ({
      key: d.date,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : weekday.format(new Date(`${d.date}T00:00:00Z`)),
      sub: formatShortDate(d.date),
      items: d.items,
      tone: i <= 3 ? ("soon" as const) : ("fresh" as const),
    })),
  ];
  const later = products.filter((p) => p.expires_on > addDays(today, 6)).length;

  return (
    <div>
      <ol className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0 sm:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]" style={{ ["--cols" as string]: columns.length }}>
        {columns.map((col) => (
          <li
            key={col.key}
            className={cx(
              "flex min-h-40 w-36 shrink-0 snap-start flex-col rounded-lg border p-3 sm:w-auto",
              col.tone === "expired" ? "border-expired/20 bg-expired-soft/40" : col.key === today ? "border-forest/25 bg-forest-wash" : "border-line bg-card",
            )}
          >
            <p className={cx("text-sm font-medium", col.tone === "expired" && "text-expired")}>{col.label}</p>
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted">{col.sub}</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {col.items.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center gap-1.5 text-[0.8125rem] leading-tight">
                  <StatusDot status={getExpiry(p.expires_on, today).status} className="shrink-0" />
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
              {col.items.length > 4 && <li className="text-xs text-muted">+{col.items.length - 4} more</li>}
              {col.items.length === 0 && <li className="text-xs text-faint">Nothing due</li>}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">
        {later > 0 ? (
          <>
            {later} more {later === 1 ? "item has" : "items have"} dates beyond this week.{" "}
            <Link href="/app/inventory" className="font-medium text-forest-mid underline-offset-4 hover:underline">
              See inventory
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
