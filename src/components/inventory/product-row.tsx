import { Archive, Refrigerator, Snowflake } from "lucide-react";
import { CATEGORY_LABEL, STORAGE_LABEL, type Storage } from "@/lib/domain/constants";
import { getExpiry } from "@/lib/domain/expiry";
import { formatQuantity } from "@/lib/domain/format";
import type { Product } from "@/lib/data/queries";
import type { WasteRisk } from "@/lib/domain/predict";
import { cx } from "@/lib/cx";
import { CategoryIcon, foodPhoto } from "@/components/ui/category-icon";
import { FreshnessBar, StatusPill } from "@/components/ui/status";
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
    <li data-savi-product={product.name} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-white/60 sm:grid-cols-[auto_minmax(0,1fr)_8.5rem_7rem_auto] sm:px-5">
      <CategoryIcon category={product.category} name={product.name} />
      <div className="relative min-w-0 [text-shadow:0_0_3px_var(--color-card),0_0_10px_var(--color-card)]">
        {/* Photo of the food, fading into the row on both sides; decorative. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- small decorative photo, lazy */}
        <img
          src={foodPhoto(product.category, product.name)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute -bottom-3.5 -top-3.5 right-0 h-[calc(100%+1.75rem)] w-32 object-cover opacity-80 [mask-image:linear-gradient(to_right,transparent,#000_55%,#000_70%,transparent)] sm:w-52 sm:opacity-90 sm:[mask-image:linear-gradient(to_right,transparent,#000_40%,#000_65%,transparent)] lg:w-64"
        />
        <div className="relative flex items-center gap-2">
          <p className="truncate font-medium"><Tx>{product.name}</Tx></p>
          {product.is_demo && <SampleTag />}
          {risk && (
            <span
              
              className={cx(
                "hidden shrink-0 rounded-sm px-1.5 text-[0.6875rem] font-medium leading-4 sm:inline",
                risk.level === "high" ? "bg-expired-soft text-expired" : "bg-soon-soft text-soon",
              )}
            >
              <Tx>May go unused</Tx>
              <span className="sr-only">: <Tx>{risk.reason}</Tx></span>
            </span>
          )}
        </div>
        <p className="relative mt-0.5 flex items-center gap-1.5 truncate text-[0.8125rem] text-muted">
          <span className="tabular"><Tx>{formatQuantity(Number(product.quantity), product.unit)}</Tx></span>
          <span aria-hidden="true">·</span>
          <StorageIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span><Tx>{STORAGE_LABEL[product.storage]}</Tx></span>
          <span aria-hidden="true" className="hidden md:inline">·</span>
          <span className="hidden md:inline"><Tx>{CATEGORY_LABEL[product.category]}</Tx></span>
        </p>
        {/* Mobile: date + status under the name */}
        <p className="relative mt-1.5 flex items-center gap-2 text-[0.8125rem] sm:hidden">
          <StatusPill status={expiry.status} />
          <span className={cx("tabular", expiry.status === "fresh" ? "text-muted" : "text-ink-2")}><Tx>{expiry.label}</Tx></span>
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
