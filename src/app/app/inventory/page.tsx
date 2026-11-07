import { PackageOpen, SearchX } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { QuickAddButton } from "@/components/dashboard/dashboard-actions";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { ProductRow } from "@/components/inventory/product-row";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORIES, STORAGES } from "@/lib/domain/constants";
import { getExpiry } from "@/lib/domain/expiry";
import { listProducts, type InventoryQuery, type SortKey, type StatusFilter } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";
import { getPrediction } from "@/lib/data/predict";

export const metadata: Metadata = { title: "Inventory" };

const pickOne = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

export default async function InventoryPage({ searchParams }: PageProps<"/app/inventory">) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const query: InventoryQuery = {
    q: typeof params.q === "string" ? params.q.slice(0, 80) : undefined,
    category: pickOne(params.category, CATEGORIES),
    storage: pickOne(params.storage, STORAGES),
    status: pickOne<StatusFilter>(params.status, ["fresh", "soon", "expired"]),
    sort: pickOne<SortKey>(params.sort, ["expiry", "name", "category", "recent"]),
  };

  const filtered = Boolean(query.q || query.category || query.storage || query.status);
  const [products, all, prediction] = await Promise.all([
    listProducts(viewer, query),
    filtered ? listProducts(viewer) : null,
    getPrediction(viewer),
  ]);
  const risks = new Map(prediction.risks.map((r) => [r.productId, r]));
  const everything = all ?? products;
  const counts: Record<string, number> = { all: everything.length, fresh: 0, soon: 0, expired: 0 };
  for (const p of everything) counts[getExpiry(p.expires_on, viewer.today).status] += 1;

  return (
    <>
      <PageHeader
        eyebrow={`${everything.length} products`}
        title="Inventory"
        description="Everything in your fridge, freezer and pantry, sorted by the date that matters most."
        actions={<QuickAddButton label="Add product" hideOnMobile />}
      />
      <InventoryFilters counts={counts} />

      {everything.length === 0 ? (
        <EmptyState icon={<PackageOpen className="size-6" />} title="Nothing here yet" action={<QuickAddButton label="Add your first product" />}>
          Start with the things you buy most often. It takes a few seconds per item.
        </EmptyState>
      ) : products.length === 0 ? (
        <EmptyState icon={<SearchX className="size-6" />} title="No matches">
          Nothing in your kitchen matches these filters. Try a different search or clear the filters.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          <div className="hidden grid-cols-[auto_minmax(0,1fr)_8.5rem_7rem_auto] gap-x-4 border-b border-line px-5 py-2.5 sm:grid">
            <span className="w-10" />
            <span className="eyebrow">Product</span>
            <span className="eyebrow">Date</span>
            <span className="eyebrow">Status</span>
            <span className="w-[8.5rem]" />
          </div>
          <ul className="divide-y divide-line">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} today={viewer.today} risk={risks.get(product.id)} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
