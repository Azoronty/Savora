import { CircleCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { ProductRow } from "@/components/inventory/product-row";
import { RecipeCard } from "@/components/meals/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { USE_SOON_DAYS } from "@/lib/domain/constants";
import { getExpiry } from "@/lib/domain/expiry";
import { recommendRecipes } from "@/lib/domain/recommend";
import { listAttentionProducts, listProducts } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Use soon") };
}

export default async function ExpiringPage() {
  const viewer = await requireViewer();
  const t = await getT();
  const [attention, products] = await Promise.all([listAttentionProducts(viewer), listProducts(viewer)]);
  const expired = attention.filter((p) => getExpiry(p.expires_on, viewer.today).status === "expired");
  const soon = attention.filter((p) => getExpiry(p.expires_on, viewer.today).status === "soon");
  const rescue = recommendRecipes(products, viewer.today, { limit: 2 }).filter((m) => m.urgent.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Expiry tracking"
        title="Use soon"
        description={t(`Items within ${USE_SOON_DAYS} days of their date, and anything already past it. Dates are what you entered — always check the product itself.`)}
      />

      {attention.length === 0 ? (
        <EmptyState
          icon={<CircleCheck className="size-6" />}
          title="Nothing needs using right now"
          action={<LinkButton href="/app/inventory" variant="secondary">{t("View inventory")}</LinkButton>}
        >
          {t(`No item is within ${USE_SOON_DAYS} days of its date. Enjoy the calm.`)}
        </EmptyState>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-10">
            {soon.length > 0 && (
              <Group title={t("Use within 3 days")} count={soon.length}>
                {soon.map((p) => (
                  <ProductRow key={p.id} product={p} today={viewer.today} />
                ))}
              </Group>
            )}
            {expired.length > 0 && (
              <Group
                title={t("Past the date you entered")}
                count={expired.length}
                note={t("Check each one. If it goes in the bin, choose “Throw away” so it's recorded in your waste log.")}
              >
                {expired.map((p) => (
                  <ProductRow key={p.id} product={p} today={viewer.today} />
                ))}
              </Group>
            )}
          </div>
          <aside>
            <p className="eyebrow mb-1.5">{t("Rescue ideas")}</p>
            <h2 className="mb-5 text-[1.6rem] font-normal leading-tight">{t("Cook these first")}</h2>
            {rescue.length > 0 ? (
              <div className="flex flex-col gap-4">
                {rescue.map((m) => (
                  <RecipeCard key={m.recipe.slug} match={m} />
                ))}
                <Link href="/app/meals" className="text-sm font-medium text-forest-mid hover:underline">
                  {t("More meal ideas →")}
                </Link>
              </div>
            ) : (
              <p className="flex gap-2 rounded-xl border border-line bg-card p-5 text-sm text-muted">
                <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t("No recipe in the collection uses these items yet. Try adding them to a soup, omelette or stir-fry.")}
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function Group({ title, count, note, children }: { title: string; count: number; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-xl font-medium">{title}</h2>
        <span className="font-mono text-xs text-muted tabular">{count}</span>
      </div>
      {note && <p className="mb-3 text-sm text-muted">{note}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">{children}</ul>
    </section>
  );
}
