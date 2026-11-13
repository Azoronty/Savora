import { STATUS_LABEL, type ExpiryInfo, type ExpiryStatus } from "@/lib/domain/expiry";
import { cx } from "@/lib/cx";
import { Tx } from "@/components/i18n/lang-provider";

const tone: Record<ExpiryStatus, string> = {
  fresh: "bg-fresh-soft text-fresh",
  soon: "bg-soon-soft text-soon",
  expired: "bg-expired-soft text-expired",
};

const dot: Record<ExpiryStatus, string> = {
  fresh: "bg-fresh",
  soon: "bg-saffron",
  expired: "bg-expired",
};

/** Status pill — always pairs colour with a text label so meaning never relies on colour alone. */
export function StatusPill({ status, className }: { status: ExpiryStatus; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        tone[status],
        className,
      )}
    >
      <span className={cx("size-1.5 rounded-full", dot[status])} aria-hidden="true" />
      <Tx>{STATUS_LABEL[status]}</Tx>
    </span>
  );
}

export function StatusDot({ status, className }: { status: ExpiryStatus; className?: string }) {
  return <span className={cx("inline-block size-2 rounded-full", dot[status], className)} aria-hidden="true" />;
}

/**
 * A compact freshness gauge: the bar empties as the date approaches.
 * Seven or more days left reads as full.
 */
export function FreshnessBar({ expiry, className }: { expiry: ExpiryInfo; className?: string }) {
  const fill = expiry.status === "expired" ? 1 : Math.max(0.12, Math.min(1, (expiry.daysLeft + 1) / 8));
  return (
    <span className={cx("relative block h-1 w-full overflow-hidden rounded-full bg-line", className)} aria-hidden="true">
      <span
        className={cx("absolute inset-y-0 left-0 rounded-full transition-[width] duration-500", dot[expiry.status])}
        style={{ width: `${fill * 100}%` }}
      />
    </span>
  );
}
