import { Archive, Refrigerator, Snowflake } from "lucide-react";
import { CATEGORY_LABEL, STORAGE_LABEL, type Storage } from "@/lib/domain/constants";
import { getExpiry } from "@/lib/domain/expiry";
import { formatQuantity } from "@/lib/domain/format";
import type { Product } from "@/lib/data/queries";
import type { WasteRisk } from "@/lib/domain/predict";
import { cx } from "@/lib/cx";
import { foodPhoto } from "@/components/ui/category-icon";
import { FreshnessBar, StatusDot, StatusPill } from "@/components/ui/status";
import { ProductActions } from "./product-actions";
import { DateText, Tx } from "@/components/i18n/lang-provider";

const STORAGE_ICON: Record<Storage, typeof Refrigerator> = { fridge: Refrigerator, freezer: Snowflake, pantry: Archive };

export function SampleTag() {
  return (
    <span className="rounded-sm border border-saffron/40 bg-saffron-soft/50 px-1.5 font-mono text-[0.625rem] uppercase leading-4 tracking-wider text-soon">
      <Tx>Sample</Tx>
    </span>
  );
}

export function ProductRow({ product, today, risk }: { product: Product; today: string; risk?: WasteRisk }) {
  const expiry = getExpiry(product.expires_on, today);
  const StorageIcon = STORAGE_ICON[product.storage];
  return (
    <li data-savi-product={product.name} className="group grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3.5 pr-4 transition-colors hover:bg-white/60 sm:grid-cols-[3.5rem_minmax(0,1fr)_8.5rem_7rem_auto] sm:gap-x-4 sm:pr-5">
      {/* The row starts with a photo of the food, flush with the card's left edge and the full row height. */}
      <div className="relative -my-3.5 self-stretch overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- small decorative photo, lazy */}
        <img src={foodPhoto(product.category, product.name)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium"><Tx>{product.name}</Tx></p>
          {risk && (
            <span
              className={cx(
                "shrink-0 rounded-sm px-1.5 text-[0.6875rem] font-medium leading-4 max-xl:hidden",
                risk.level === "high" ? "bg-expired-soft text-expired" : "bg-soon-soft text-soon",
              )}
            >
              <Tx>May go unused</Tx>
              <span className="sr-only">: <Tx>{risk.reason}</Tx></span>
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.8125rem] text-muted">
          <span className="tabular"><Tx>{formatQuantity(Number(product.quantity), product.unit)}</Tx></span>
          <span aria-hidden="true">·</span>
          <StorageIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span><Tx>{STORAGE_LABEL[product.storage]}</Tx></span>
          <span aria-hidden="true" className="hidden md:inline">·</span>
          <span className="hidden md:inline"><Tx>{CATEGORY_LABEL[product.category]}</Tx></span>
        </p>
        {/* Mobile: date + status under the name */}
        <p className="mt-1.5 flex items-center gap-2 text-[0.8125rem] sm:hidden">
          <StatusDot status={expiry.status} className="shrink-0" />
          <span className={cx("min-w-0 truncate tabular", expiry.status === "fresh" ? "text-muted" : "text-ink-2")}><Tx>{expiry.label}</Tx></span>
        </p>
      </div>
      <div className="hidden sm:block">
        <p className="font-mono text-[0.8125rem] tabular text-ink"><DateText iso={product.expires_on} /></p>
        <p className={cx("text-[0.8125rem]", expiry.status === "fresh" ? "text-muted" : "text-ink-2")}><Tx>{expiry.label}</Tx></p>
        <FreshnessBar expiry={expiry} className="mt-1.5 w-20" />
      </div>
      <div className="hidden sm:block">
        <StatusPill status={expiry.status} />
      </div>
      <ProductActions product={product} today={today} />
    </li>
  );
}
