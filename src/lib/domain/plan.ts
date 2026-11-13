import { matchCatalog } from "./catalog";
import type { Category, Storage } from "./constants";
import { addDays, daysBetween, type IsoDate } from "./dates";
import { RECIPES, type Recipe } from "./recipes";
import { ingredientLabel, type MissingIngredient } from "./recommend";

/**
 * Rescue plan: schedule meals for the coming days so that as many items as
 * possible are cooked before their date.
 *
 * This is a scheduling problem with deadlines (each at-risk item must be used
 * on or before its date). The planner is a deterministic greedy pass, earliest
 * deadline first: each day it picks the recipe that rescues the most urgent
 * still-uncovered items, where an item's weight grows as its remaining slack
 * (days left minus the day of the meal) shrinks. Assumption shown in the UI:
 * one dish uses up the at-risk item it includes.
 */

export type PlanItem = {
  id: string;
  name: string;
  expires_on: IsoDate;
  category: Category;
  storage: Storage;
  price_cents: number | null;
};

export type PlannedUse = { item: PlanItem; daysLeft: number };

export type PlannedMeal = {
  recipe: Recipe;
  /** At-risk items this meal rescues, most urgent first. */
  rescues: PlannedUse[];
  missing: MissingIngredient[];
  reason: string;
};

export type PlanDay = { date: IsoDate; offset: number; meals: PlannedMeal[] };

export type RescueAction = "freeze" | "eat" | "cook";
export type RescueStep = { item: PlanItem; daysLeft: number; action: RescueAction; text: string };

export type RescuePlan = {
  days: PlanDay[];
  /** Items whose date falls inside the plan window. */
  atRisk: PlanItem[];
  /** At-risk items the planned meals use before their date. */
  saved: PlanItem[];
  atRiskValueCents: number;
  savedValueCents: number;
  /** At-risk items no planned meal uses, each with a practical next step. */
  rescueSteps: RescueStep[];
  /** Missing main ingredients across the plan, one entry per ingredient. */
  toBuy: MissingIngredient[];
};

export type PlanOptions = { days?: number; maxMissing?: number; mealsPerDay?: number };

/** How urgent it is to use an item on a given day, by slack (days left after that meal). */
export function slackWeight(slack: number): number {
  if (slack <= 0) return 10;
  if (slack === 1) return 7;
  if (slack === 2) return 5;
  if (slack === 3) return 3;
  return 2;
}

const FREEZABLE: Category[] = ["meat", "fish", "bakery"];
/** A meal is planned only when one of its items has at most this many days of slack left. */
const SLACK_WINDOW = 2;

function rescueStep(item: PlanItem, daysLeft: number): RescueStep {
  const when = daysLeft === 0 ? "today" : daysLeft === 1 ? "by tomorrow" : `within ${daysLeft} days`;
  if (FREEZABLE.includes(item.category) && item.storage !== "freezer") {
    return { item, daysLeft, action: "freeze", text: `Freeze it ${when}: it then keeps for weeks.` };
  }
  if (item.category === "fruits" || item.category === "dairy" || item.category === "drinks") {
    return { item, daysLeft, action: "eat", text: `Eat or drink it ${when}, as a snack or with breakfast.` };
  }
  return { item, daysLeft, action: "cook", text: `Add it to a soup, stir-fry or salad ${when}.` };
}

const sumCents = (items: PlanItem[]) => items.reduce((s, i) => s + (i.price_cents ?? 0), 0);

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function planWeek(items: PlanItem[], today: IsoDate, { days = 7, maxMissing = 1, mealsPerDay = 2 }: PlanOptions = {}, recipes: Recipe[] = RECIPES): RescuePlan {
  const usable = items
    .map((item) => ({ item, daysLeft: daysBetween(today, item.expires_on), key: matchCatalog(item.name)?.key }))
    .filter((u) => u.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const atRisk = usable.filter((u) => u.daysLeft < days);
  const isAtRisk = new Set(atRisk.map((u) => u.item.id));
  const covered = new Set<string>();
  const cookedOn = new Map<string, number>();
  const plan: PlanDay[] = [];

  for (let d = 0; d < days; d++) {
    const meals: PlannedMeal[] = [];
    for (let m = 0; m < mealsPerDay; m++) {
      let best: { recipe: Recipe; score: number; rescues: PlannedUse[]; missing: MissingIngredient[] } | null = null;

      for (const recipe of recipes) {
        const last = cookedOn.get(recipe.slug);
        if (last !== undefined && d - last < 3) continue; // no repeats within three days

        const rescues: PlannedUse[] = [];
        const missing: MissingIngredient[] = [];
        for (const ingredient of recipe.ingredients) {
          // Still in date on day d; prefer an uncovered at-risk item with the least slack.
          const candidates = usable.filter((u) => u.key && ingredient.keys.includes(u.key) && u.daysLeft >= d);
          const urgent = candidates.find((u) => isAtRisk.has(u.item.id) && !covered.has(u.item.id) && !rescues.some((r) => r.item.id === u.item.id));
          if (urgent) rescues.push({ item: urgent.item, daysLeft: urgent.daysLeft });
          else if (candidates.length === 0 && !ingredient.optional) {
            const key = ingredient.keys[0];
            missing.push({ key, label: ingredientLabel(key), amount: ingredient.amount });
          }
        }
        if (rescues.length === 0 || missing.length > maxMissing) continue;
        // Don't cook food early just because a slot is free: at least one item must be within two days of its date.
        if (!rescues.some((r) => r.daysLeft - d <= SLACK_WINDOW)) continue;

        const score = rescues.reduce((sum, r) => sum + slackWeight(r.daysLeft - d), 0) - missing.length * 3 - recipe.minutes / 100;
        if (!best || score > best.score) best = { recipe, score, rescues, missing };
      }
      if (!best) break;

      best.rescues.forEach((r) => covered.add(r.item.id));
      cookedOn.set(best.recipe.slug, d);
      const rescued = best.rescues.sort((x, y) => x.daysLeft - y.daysLeft);
      const tightest = rescued.filter((r) => r.daysLeft - d <= 1).map((r) => r.item.name.toLowerCase());
      const reason = tightest.length
        ? `Last chance for ${joinNames(tightest)}.`
        : `Uses ${joinNames(rescued.map((r) => r.item.name.toLowerCase()))} before ${rescued.length === 1 ? "its date" : "their dates"}.`;
      meals.push({ recipe: best.recipe, rescues: rescued, missing: best.missing, reason });
    }
    plan.push({ date: addDays(today, d), offset: d, meals });
  }

  const saved = atRisk.filter((u) => covered.has(u.item.id)).map((u) => u.item);
  const toBuy = new Map<string, MissingIngredient>();
  plan.forEach((day) => day.meals.forEach((meal) => meal.missing.forEach((m) => toBuy.set(m.key, m))));

  return {
    days: plan,
    atRisk: atRisk.map((u) => u.item),
    saved,
    atRiskValueCents: sumCents(atRisk.map((u) => u.item)),
    savedValueCents: sumCents(saved),
    rescueSteps: atRisk.filter((u) => !covered.has(u.item.id)).map((u) => rescueStep(u.item, u.daysLeft)),
    toBuy: [...toBuy.values()],
  };
}

/** One-line morning summary used by push reminders. `t` translates it (identity = English). */
export function reminderText(plan: RescuePlan, t: (text: string, vars?: Record<string, string | number>) => string = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => String(v?.[k] ?? ""))): { title: string; body: string } {
  const today = plan.days[0];
  const urgent = today ? plan.atRisk.filter((i) => daysBetween(today.date, i.expires_on) <= 1) : [];
  const title = t(urgent.length
    ? urgent.length === 1
      ? "1 item reaches its date by tomorrow"
      : `${urgent.length} items reach their date by tomorrow`
    : plan.atRisk.length
      ? `${plan.atRisk.length} ${plan.atRisk.length === 1 ? "item needs" : "items need"} using this week`
      : "Your kitchen is on track");
  const names = urgent.slice(0, 3).map((i) => t(i.name));
  const parts: string[] = [];
  if (names.length) parts.push(`${joinNames(names).replace(/ and ([^,]+)$/, `${t(" and ")}$1`)}.`);
  const meal = today?.meals[0];
  if (meal) parts.push(t("Today's rescue meal: {title} ({min} min).", { title: t(meal.recipe.title), min: meal.recipe.minutes }));
  else if (plan.rescueSteps[0]) parts.push(`${t(plan.rescueSteps[0].item.name)}: ${t(plan.rescueSteps[0].text)}`);
  if (!parts.length) parts.push(t("Nothing needs using soon. Open Savora to plan the week."));
  return { title, body: parts.join(" ") };
}
