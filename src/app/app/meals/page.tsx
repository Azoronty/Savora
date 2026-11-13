import { CookingPot } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { RecipeCard } from "@/components/meals/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { RECIPES } from "@/lib/domain/recipes";
import { evaluateRecipe, recommendRecipes } from "@/lib/domain/recommend";
import { listProducts } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Meals") };
}

const FILTERS = [
  { value: "", label: "Best matches" },
  { value: "rescue", label: "Uses items expiring soon" },
  { value: "ready", label: "Ready to cook" },
  { value: "quick", label: "20 minutes or less" },
] as const;

export default async function MealsPage({ searchParams }: PageProps<"/app/meals">) {
  const viewer = await requireViewer();
  const t = await getT();
  const { filter } = await searchParams;
  const products = await listProducts(viewer);

  let matches = recommendRecipes(products, viewer.today);
  if (filter === "rescue") matches = matches.filter((m) => m.urgent.length > 0);
  if (filter === "ready") matches = matches.filter((m) => m.missing.length === 0);
  if (filter === "quick") matches = matches.filter((m) => m.recipe.minutes <= 20);

  const suggested = new Set(recommendRecipes(products, viewer.today).map((m) => m.recipe.slug));
  const others = RECIPES.filter((r) => !suggested.has(r.slug)).map((r) => evaluateRecipe(r, products, viewer.today));

  return (
    <>
      <PageHeader
        eyebrow="Smart suggestions"
        title="What to cook"
        description="Ranked by what needs using first, then by how much you already have. Each suggestion says why it's here."
      />

      <nav aria-label={t("Filter suggestions")} className="-mx-4 mb-8 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => {
          const active = (filter ?? "") === f.value;
          return (
            <Link
              key={f.value}
              href={f.value ? `/app/meals?filter=${f.value}` : "/app/meals"}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cx(
                "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors",
                active ? "bg-ink text-card" : "text-ink-2 hover:bg-paper-deep",
              )}
            >
              {t(f.label)}
            </Link>
          );
        })}
      </nav>

      {matches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((m, i) => (
            <RecipeCard key={m.recipe.slug} match={m} featured={!filter && i === 0 && m.urgent.length > 0} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CookingPot className="size-6" />}
          title={products.length ? "No recipes fit this filter" : "Add ingredients to get suggestions"}
          action={!products.length ? <LinkButton href="/app/inventory">{t("Go to inventory")}</LinkButton> : undefined}
        >
          {t(products.length
            ? "Try another filter, or browse the full collection below."
            : "Suggestions are built from what's in your kitchen, so they appear once you've added a few items.")}
        </EmptyState>
      )}

      {others.length > 0 && (
        <section className="mt-16" aria-labelledby="collection-heading">
          <p className="eyebrow mb-1.5">{t("The collection")}</p>
          <h2 id="collection-heading" className="mb-2 text-[1.6rem] font-normal">
            {t("More recipes")}
          </h2>
          <p className="mb-6 text-sm text-muted">{t("These need a few more ingredients than you have right now.")}</p>
          <ul className="grid gap-x-8 divide-y divide-line border-y border-line sm:grid-cols-2 sm:divide-y-0">
            {others.map((m) => (
              <li key={m.recipe.slug} className="sm:border-b sm:border-line">
                <Link href={`/app/meals/${m.recipe.slug}`} className="group flex items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block font-medium group-hover:text-forest-mid">{t(m.recipe.title)}</span>
                    <span className="text-[0.8125rem] text-muted">
                      {t("{n} min", { n: m.recipe.minutes })} · {t("{a}/{b} in stock", { a: m.requiredCount - m.missing.length, b: m.requiredCount })}
                    </span>
                  </span>
                  <span className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
