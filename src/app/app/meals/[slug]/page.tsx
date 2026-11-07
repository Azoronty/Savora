import { ArrowLeft, Check, Circle, Clock, Gauge, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeActions, type CookableItem } from "@/components/meals/recipe-actions";
import { IngredientDots } from "@/components/meals/recipe-card";
import { USE_SOON_DAYS } from "@/lib/domain/constants";
import { relativeExpiryLabel } from "@/lib/domain/expiry";
import { getRecipe } from "@/lib/domain/recipes";
import { evaluateRecipe, ingredientLabel } from "@/lib/domain/recommend";
import { listProducts } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";
import { cx } from "@/lib/cx";

export async function generateMetadata({ params }: PageProps<"/app/meals/[slug]">): Promise<Metadata> {
  const recipe = getRecipe((await params).slug);
  return { title: recipe?.title ?? "Recipe" };
}

export default async function RecipePage({ params }: PageProps<"/app/meals/[slug]">) {
  const recipe = getRecipe((await params).slug);
  if (!recipe) notFound();
  const viewer = await requireViewer();
  const products = await listProducts(viewer);
  const match = evaluateRecipe(recipe, products, viewer.today);
  const byId = new Map(products.map((p) => [p.id, p]));

  const cookable: CookableItem[] = match.matched.flatMap((m) => {
    const p = byId.get(m.product.id);
    return p ? [{ id: p.id, name: p.name, quantity: Number(p.quantity), unit: p.unit, amount: m.amount, optional: m.optional }] : [];
  });

  return (
    <article>
      <Link href="/app/meals" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> All meals
      </Link>

      <header className="mb-10 grid gap-8 border-b border-line pb-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="eyebrow mb-3">{recipe.tags.join(" · ")}</p>
          <h1 className="text-[2.4rem] font-normal leading-[1.02] sm:text-[3.4rem]">{recipe.title}</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-2">{recipe.summary}</p>
          <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            <Meta icon={<Clock />} label="Time" value={`${recipe.minutes} min`} />
            <Meta icon={<Users />} label="Serves" value={String(recipe.servings)} />
            <Meta icon={<Gauge />} label="Effort" value={recipe.difficulty === "easy" ? "Easy" : "Medium"} />
          </dl>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="eyebrow mb-3">Why it’s suggested</p>
          <IngredientDots match={match} className="mb-4" />
          <ul className="flex flex-col gap-2 text-sm">
            {match.reasons.map((reason, i) => (
              <li key={reason} className="flex gap-2">
                {i === 0 && match.urgent.length > 0 ? (
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-soon" aria-hidden="true" />
                ) : (
                  <Check className="mt-0.5 size-4 shrink-0 text-forest-mid" aria-hidden="true" />
                )}
                {reason}
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-line pt-5">
            <RecipeActions slug={recipe.slug} missingCount={match.missing.length} items={cookable} />
          </div>
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="mb-5 text-2xl font-normal">
            Ingredients
          </h2>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {recipe.ingredients.map((ingredient) => {
              const hit = match.matched.find((m) => ingredient.keys.includes(m.key));
              const urgent = hit && hit.daysLeft <= USE_SOON_DAYS;
              const label = hit ? ingredientLabel(hit.key) : ingredient.keys.map(ingredientLabel).join(" or ");
              return (
                <li key={ingredient.keys.join("|")} className="flex items-start gap-3 py-3.5">
                  <span
                    className={cx(
                      "mt-1 flex size-4 shrink-0 items-center justify-center rounded-full",
                      hit ? (urgent ? "bg-saffron text-card" : "bg-forest-mid text-card") : "border border-line-strong",
                    )}
                    aria-hidden="true"
                  >
                    {hit && <Check className="size-2.5" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{label}</span>
                      <span className="text-sm text-muted">{ingredient.amount}</span>
                      {ingredient.optional && <span className="text-xs text-faint">optional</span>}
                    </p>
                    <p className={cx("text-[0.8125rem]", hit ? (urgent ? "text-soon" : "text-muted") : "text-muted")}>
                      {hit
                        ? `In stock: ${hit.product.name} · ${relativeExpiryLabel(hit.daysLeft)}`
                        : ingredient.optional
                          ? "Not in stock — fine to skip"
                          : "Not in stock"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {recipe.staples.length > 0 && (
            <p className="mt-4 flex gap-2 text-sm text-muted">
              <Circle className="mt-1 size-2 shrink-0 fill-current" aria-hidden="true" />
              Pantry basics assumed: {recipe.staples.join(", ").toLowerCase()}.
            </p>
          )}
        </section>

        <section aria-labelledby="method-heading">
          <h2 id="method-heading" className="mb-5 text-2xl font-normal">
            Method
          </h2>
          <ol className="flex flex-col gap-6">
            {recipe.steps.map((step, i) => (
              <li key={step} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                <span className="font-display text-2xl leading-none text-saffron tabular">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-[1.0625rem] leading-relaxed text-ink-2">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactElement<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted">
      {icon}
      <dt className="sr-only">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
