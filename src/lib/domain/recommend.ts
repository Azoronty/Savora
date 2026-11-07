import { getCatalogEntry, matchCatalog } from "./catalog";
import { USE_SOON_DAYS } from "./constants";
import { daysBetween, type IsoDate } from "./dates";
import { RECIPES, type Recipe, type RecipeIngredient } from "./recipes";

export type InventoryItem = {
  id: string;
  name: string;
  expires_on: IsoDate;
};

export type MatchedIngredient = {
  key: string;
  label: string;
  amount: string;
  optional: boolean;
  product: InventoryItem;
  daysLeft: number;
};

export type MissingIngredient = {
  key: string;
  label: string;
  amount: string;
};

export type RecipeMatch = {
  recipe: Recipe;
  score: number;
  matched: MatchedIngredient[];
  missing: MissingIngredient[];
  requiredCount: number;
  /** Matched ingredients whose date is within the use-soon window. */
  urgent: MatchedIngredient[];
  reasons: string[];
};

export function ingredientLabel(key: string): string {
  return getCatalogEntry(key)?.label ?? key;
}

/** How much using an item now is worth, by days left on its date. */
export function urgencyWeight(daysLeft: number): number {
  if (daysLeft <= 1) return 4;
  if (daysLeft <= USE_SOON_DAYS) return 3;
  if (daysLeft <= 7) return 1.5;
  return 0.5;
}

/**
 * Index usable inventory by ingredient key, keeping the most urgent product
 * for each key. Items past their entered date are left out: SAVORA never
 * suggests cooking with them.
 */
export function indexInventory(items: InventoryItem[], today: IsoDate): Map<string, { product: InventoryItem; daysLeft: number }> {
  const index = new Map<string, { product: InventoryItem; daysLeft: number }>();
  for (const product of items) {
    const daysLeft = daysBetween(today, product.expires_on);
    if (daysLeft < 0) continue;
    const key = matchCatalog(product.name)?.key;
    if (!key) continue;
    const current = index.get(key);
    if (!current || daysLeft < current.daysLeft) index.set(key, { product, daysLeft });
  }
  return index;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function daysPhrase(daysLeft: number): string {
  if (daysLeft === 0) return "date is today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

function explain(match: Omit<RecipeMatch, "reasons" | "score">): string[] {
  const reasons: string[] = [];
  if (match.urgent.length > 0) {
    const parts = match.urgent
      .slice(0, 3)
      .map((m) => `${m.product.name.toLowerCase()} (${daysPhrase(m.daysLeft)})`);
    reasons.push(`Uses up ${joinNames(parts)}`);
  }
  const have = match.requiredCount - match.missing.length;
  if (match.missing.length === 0) {
    reasons.push("You have every main ingredient");
  } else {
    reasons.push(`You have ${have} of ${match.requiredCount} main ingredients`);
    reasons.push(`Missing: ${joinNames(match.missing.map((m) => m.label.toLowerCase()))}`);
  }
  return reasons;
}

function evaluate(
  recipe: Recipe,
  index: Map<string, { product: InventoryItem; daysLeft: number }>,
): RecipeMatch {
  const matched: MatchedIngredient[] = [];
  const missing: MissingIngredient[] = [];

  const pick = (ingredient: RecipeIngredient) => {
    let best: { key: string; product: InventoryItem; daysLeft: number } | undefined;
    for (const key of ingredient.keys) {
      const hit = index.get(key);
      if (hit && (!best || hit.daysLeft < best.daysLeft)) best = { key, ...hit };
    }
    return best;
  };

  for (const ingredient of recipe.ingredients) {
    const hit = pick(ingredient);
    if (hit) {
      matched.push({
        key: hit.key,
        label: ingredientLabel(hit.key),
        amount: ingredient.amount,
        optional: Boolean(ingredient.optional),
        product: hit.product,
        daysLeft: hit.daysLeft,
      });
    } else if (!ingredient.optional) {
      const key = ingredient.keys[0];
      missing.push({ key, label: ingredientLabel(key), amount: ingredient.amount });
    }
  }

  const requiredCount = recipe.ingredients.filter((i) => !i.optional).length;
  const urgent = matched
    .filter((m) => m.daysLeft <= USE_SOON_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const coverage = requiredCount === 0 ? 1 : (requiredCount - missing.length) / requiredCount;
  const urgencyScore = matched.reduce((sum, m) => sum + urgencyWeight(m.daysLeft), 0);
  const score = urgencyScore + coverage * 6 - missing.length * 2;

  const base = { recipe, matched, missing, requiredCount, urgent };
  return { ...base, score: Math.round(score * 100) / 100, reasons: explain(base) };
}

export type RecommendOptions = {
  limit?: number;
  /** Keep recipes missing at most this many main ingredients. */
  maxMissing?: number;
};

/**
 * Rank recipes for the current inventory. Recipes need at least one main
 * ingredient in stock; ranking favours using soon-to-expire items, then
 * coverage, and penalises each missing ingredient.
 */
export function recommendRecipes(
  items: InventoryItem[],
  today: IsoDate,
  { limit, maxMissing = 2 }: RecommendOptions = {},
  recipes: Recipe[] = RECIPES,
): RecipeMatch[] {
  const index = indexInventory(items, today);
  const ranked = recipes
    .map((recipe) => evaluate(recipe, index))
    .filter((m) => m.requiredCount - m.missing.length > 0 && m.missing.length <= maxMissing)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.missing.length - b.missing.length ||
        a.recipe.minutes - b.recipe.minutes,
    );
  return limit ? ranked.slice(0, limit) : ranked;
}

/** Evaluate a single recipe (recipe detail page), regardless of filters. */
export function evaluateRecipe(recipe: Recipe, items: InventoryItem[], today: IsoDate): RecipeMatch {
  return evaluate(recipe, indexInventory(items, today));
}
