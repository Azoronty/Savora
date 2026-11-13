import type { ReactNode } from "react";
import { Tx } from "@/components/i18n/lang-provider";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3"><Tx>{eyebrow}</Tx></p>}
        <h1 className="text-[2.1rem] font-normal leading-[1.05] sm:text-[2.6rem]"><Tx>{title}</Tx></h1>
        {description && <p className="mt-3 max-w-xl text-[0.9375rem] text-muted">{typeof description === "string" ? <Tx>{description}</Tx> : description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
