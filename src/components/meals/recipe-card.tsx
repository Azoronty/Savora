import { ArrowUpRight, Clock, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import type { RecipeMatch } from "@/lib/domain/recommend";
import { USE_SOON_DAYS } from "@/lib/domain/constants";
import { cx } from "@/lib/cx";

/**
 * Ingredient availability strip: one mark per main ingredient.
 * Filled = in stock, saffron = in stock and needs using, outline = missing.
 */
export function IngredientDots({ match, className, onDark }: { match: RecipeMatch; className?: string; onDark?: boolean }) {
  const required = match.matched.filter((m) => !m.optional);
  return (
    <div className={cx("flex flex-wrap items-center gap-1", className)} aria-hidden="true">
      {required.map((m) => (
        <span
          key={m.key}
          className={cx("h-2 w-5 rounded-full", m.daysLeft <= USE_SOON_DAYS ? "bg-saffron" : onDark ? "bg-card/85" : "bg-forest-mid")}
        />
      ))}
      {match.missing.map((m) => (
        <span key={m.key} className={cx("h-2 w-5 rounded-full border", onDark ? "border-card/35" : "border-line-strong")} />
      ))}
    </div>
  );
}

export function RecipeCard({ match, featured = false }: { match: RecipeMatch; featured?: boolean }) {
  const { recipe } = match;
  const have = match.requiredCount - match.missing.length;
  return (
    <Link
      href={`/app/meals/${recipe.slug}`}
      className={cx(
        "group relative flex flex-col rounded-xl border border-line bg-card p-5 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:p-6",
        featured && "bg-forest text-card hover:border-forest",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cx("eyebrow", featured && "text-card/70")}>{recipe.tags.slice(0, 2).join(" · ")}</p>
        <ArrowUpRight
          className={cx("size-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5", featured ? "text-card/70" : "text-muted")}
          aria-hidden="true"
        />
      </div>
      <h3 className={cx("mt-3 text-[1.45rem] font-normal leading-tight", featured && "text-card")}>{recipe.title}</h3>

      {match.urgent.length > 0 && (
        <p className={cx("mt-3 flex items-start gap-2 text-sm", featured ? "text-saffron-soft" : "text-soon")}>
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{match.reasons[0]}</span>
        </p>
      )}
      {match.urgent.length === 0 && (
        <p className={cx("mt-3 text-sm", featured ? "text-card/75" : "text-muted")}>{recipe.summary}</p>
      )}

      <div className="mt-auto pt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <IngredientDots match={match} onDark={featured} />
          <span className={cx("text-xs tabular", featured ? "text-card/75" : "text-muted")}>
            {have}/{match.requiredCount} in stock
          </span>
        </div>
        <div
          className={cx(
            "flex items-center gap-4 whitespace-nowrap border-t pt-3 text-[0.8125rem]",
            featured ? "border-card/15 text-card/75" : "border-line text-muted",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {recipe.minutes} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden="true" />
            Serves {recipe.servings}
          </span>
          <span className="ml-auto">
            {match.missing.length === 0 ? "Ready to cook" : `Needs ${match.missing.length} more`}
          </span>
        </div>
      </div>
    </Link>
  );
}
