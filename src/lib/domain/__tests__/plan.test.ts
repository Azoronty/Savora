import { describe, expect, it } from "vitest";
import { planWeek, reminderText, slackWeight, type PlanItem } from "../plan";
import type { Recipe } from "../recipes";

const today = "2026-11-09";
let n = 0;
const item = (name: string, expires_on: string, extra: Partial<PlanItem> = {}): PlanItem => ({
  id: `p${++n}`,
  name,
  expires_on,
  category: "vegetables",
  storage: "fridge",
  price_cents: null,
  ...extra,
});
const recipe = (slug: string, keys: string[][], minutes = 10): Recipe => ({
  slug,
  title: slug,
  summary: "",
  minutes,
  servings: 1,
  difficulty: "easy",
  tags: [],
  staples: [],
  steps: [],
  ingredients: keys.map((k) => ({ keys: k, amount: "1" })),
});

describe("rescue planner", () => {
  it("weights tighter slack higher", () => {
    expect(slackWeight(0)).toBeGreaterThan(slackWeight(1));
    expect(slackWeight(1)).toBeGreaterThan(slackWeight(4));
  });

  it("cooks the item with the earliest date first", () => {
    const spinach = item("Spinach", "2026-11-09");
    const chicken = item("Chicken", "2026-11-11", { category: "meat" });
    const plan = planWeek([chicken, spinach], today, {}, [recipe("greens", [["spinach"]]), recipe("roast", [["chicken"]])]);
    const once = planWeek([chicken, spinach], today, { mealsPerDay: 1 }, [recipe("greens", [["spinach"]]), recipe("roast", [["chicken"]])]);
    expect(once.days[0].meals[0].recipe.slug).toBe("greens");
    expect(once.days[1].meals[0].recipe.slug).toBe("roast");
    expect(plan.saved.map((i) => i.name).sort()).toEqual(["Chicken", "Spinach"]);
    expect(plan.rescueSteps).toEqual([]);
  });

  it("never plans an item after its date and never uses past-date items", () => {
    const old = item("Milk", "2026-11-08", { category: "dairy" });
    const feta = item("Feta", "2026-11-10", { category: "dairy" });
    const plan = planWeek([old, feta], today, {}, [recipe("a", [["milk"]]), recipe("b", [["feta"]])]);
    expect(plan.atRisk.map((i) => i.name)).toEqual(["Feta"]);
    for (const day of plan.days) for (const meal of day.meals) for (const r of meal.rescues) expect(r.daysLeft).toBeGreaterThanOrEqual(day.offset);
  });

  it("does not repeat a recipe within three days", () => {
    const items = [item("Spinach", "2026-11-09"), item("Baby spinach", "2026-11-10"), item("Spinach", "2026-11-11")];
    const plan = planWeek(items, today, {}, [recipe("greens", [["spinach"]])]);
    const days = plan.days.filter((d) => d.meals.length).map((d) => d.offset);
    expect(days).toEqual([0]);
    expect(plan.rescueSteps).toHaveLength(2);
  });

  it("allows one missing ingredient and lists it to buy once", () => {
    const plan = planWeek([item("Spinach", "2026-11-09")], today, { maxMissing: 1 }, [recipe("omelette", [["egg"], ["spinach"]])]);
    expect(plan.days[0].meals[0].recipe.slug).toBe("omelette");
    expect(plan.toBuy.map((m) => m.key)).toEqual(["egg"]);
    const strict = planWeek([item("Spinach", "2026-11-09")], today, { maxMissing: 0 }, [recipe("omelette", [["egg"], ["spinach"]])]);
    expect(strict.days[0].meals).toEqual([]);
  });

  it("fits two meals into a day when two items share a deadline", () => {
    const items = [item("Spinach", "2026-11-09"), item("Chicken", "2026-11-09", { category: "meat" })];
    const recipes = [recipe("greens", [["spinach"]]), recipe("roast", [["chicken"]])];
    expect(planWeek(items, today, { mealsPerDay: 1 }, recipes).saved).toHaveLength(1);
    expect(planWeek(items, today, { mealsPerDay: 2 }, recipes).saved).toHaveLength(2);
  });

  it("suggests freezing meat that no meal uses, and counts value only from prices", () => {
    const chicken = item("Chicken", "2026-11-10", { category: "meat", price_cents: 600 });
    const plan = planWeek([chicken], today, {}, [recipe("salad", [["lettuce"]])]);
    expect(plan.rescueSteps[0].action).toBe("freeze");
    expect(plan.atRiskValueCents).toBe(600);
    expect(plan.savedValueCents).toBe(0);
  });

  it("writes a morning reminder about what reaches its date", () => {
    const plan = planWeek([item("Spinach", "2026-11-09")], today, {}, [recipe("greens", [["spinach"]])]);
    const text = reminderText(plan);
    expect(text.title).toBe("1 item reaches its date by tomorrow");
    expect(text.body).toContain("greens");
  });
});
