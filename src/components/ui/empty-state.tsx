import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-forest-wash text-forest-mid">{icon}</div>
      <h3 className="text-xl font-medium">{title}</h3>
      {children && <div className="mt-2 max-w-sm text-[0.9375rem] text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
