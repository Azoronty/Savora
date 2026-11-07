import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo";
import { evaluateRecipe, recommendRecipes, urgencyWeight } from "../recommend";
import { getRecipe, type Recipe } from "../recipes";
import { computeWasteStats } from "../waste";
import { productSchema } from "@/lib/validation";

const today = "2026-11-06";
let n = 0;
const item = (name: string, expires_on: string) => ({ id: `p${++n}`, name, expires_on });

const recipe = (slug: string, keys: string[][], optional: string[] = []): Recipe => ({
  slug,
  title: slug,
  summary: "",
  minutes: 10,
  servings: 1,
  difficulty: "easy",
  tags: [],
  staples: [],
  steps: [],
  ingredients: [
    ...keys.map((k) => ({ keys: k, amount: "1" })),
    ...optional.map((k) => ({ keys: [k], amount: "1", optional: true })),
  ],
});

describe("recommendation engine", () => {
  it("weights urgency by days left", () => {
    expect(urgencyWeight(0)).toBeGreaterThan(urgencyWeight(3));
    expect(urgencyWeight(3)).toBeGreaterThan(urgencyWeight(7));
    expect(urgencyWeight(7)).toBeGreaterThan(urgencyWeight(30));
  });

  it("ranks recipes that rescue soon-to-expire items first", () => {
    const recipes = [recipe("uses-fresh", [["rice"], ["egg"]]), recipe("uses-urgent", [["spinach"], ["egg"]])];
    const items = [item("Rice", "2027-06-01"), item("Eggs", "2026-11-20"), item("Spinach", "2026-11-07")];
    const ranked = recommendRecipes(items, today, {}, recipes);
    expect(ranked.map((r) => r.recipe.slug)).toEqual(["uses-urgent", "uses-fresh"]);
    expect(ranked[0].reasons[0]).toBe("Uses up spinach (1 day left)");
  });

  it("prefers full coverage over a missing ingredient at equal urgency", () => {
    const recipes = [recipe("missing-one", [["pasta"], ["basil"]]), recipe("complete", [["pasta"], ["garlic"]])];
    const items = [item("Spaghetti", "2027-01-01"), item("Garlic", "2027-01-01")];
    const ranked = recommendRecipes(items, today, {}, recipes);
    expect(ranked[0].recipe.slug).toBe("complete");
    expect(ranked[1].missing.map((m) => m.key)).toEqual(["basil"]);
  });

  it("never uses items past their date and drops recipes with nothing in stock", () => {
    const recipes = [recipe("milk-only", [["milk"]])];
    expect(recommendRecipes([item("Milk", "2026-11-05")], today, {}, recipes)).toEqual([]);
  });

  it("accepts alternatives and picks the most urgent one", () => {
    const r = recipe("alt", [["carrot", "broccoli"]]);
    const match = evaluateRecipe(r, [item("Carrots", "2026-11-20"), item("Broccoli", "2026-11-08")], today);
    expect(match.matched[0].key).toBe("broccoli");
    expect(match.missing).toEqual([]);
  });

  it("does not count optional ingredients as missing", () => {
    const r = recipe("opt", [["egg"]], ["feta"]);
    const match = evaluateRecipe(r, [item("Eggs", "2026-11-20")], today);
    expect(match.missing).toEqual([]);
    expect(match.reasons).toContain("You have every main ingredient");
  });

  it("respects maxMissing and limit", () => {
    const recipes = [recipe("a", [["egg"], ["basil"], ["lemon"], ["lime"]]), recipe("b", [["egg"]])];
    const ranked = recommendRecipes([item("Eggs", "2026-11-20")], today, { maxMissing: 2, limit: 5 }, recipes);
    expect(ranked.map((r) => r.recipe.slug)).toEqual(["b"]);
  });

  it("produces useful suggestions for the demo kitchen", () => {
    const demo = buildDemoData(today).products.map((p, i) => ({ id: String(i), name: p.name, expires_on: p.expires_on }));
    const ranked = recommendRecipes(demo, today, { limit: 3 });
    expect(ranked.length).toBe(3);
    expect(ranked[0].urgent.length).toBeGreaterThan(0);
    expect(evaluateRecipe(getRecipe("spinach-feta-omelette")!, demo, today).missing).toEqual([]);
  });
});

describe("waste statistics", () => {
  const entries = [
    { category: "dairy" as const, reason: "expired" as const, discarded_on: "2026-11-05", cost_cents: 150 },
    { category: "dairy" as const, reason: "spoiled" as const, discarded_on: "2026-11-02", cost_cents: null },
    { category: "fruits" as const, reason: "spoiled" as const, discarded_on: "2026-10-20", cost_cents: 300 },
    { category: "meat" as const, reason: "expired" as const, discarded_on: "2026-07-01", cost_cents: 500 },
  ];

  it("sums only recorded costs", () => {
    const stats = computeWasteStats(entries, today);
    expect(stats.count).toBe(4);
    expect(stats.costCents).toBe(950);
    expect(stats.entriesWithCost).toBe(3);
  });

  it("compares this month with last month", () => {
    const stats = computeWasteStats(entries, today);
    expect(stats.thisMonth).toEqual({ count: 2, costCents: 150 });
    expect(stats.lastMonth).toEqual({ count: 1, costCents: 300 });
  });

  it("buckets entries into weeks and categories", () => {
    const stats = computeWasteStats(entries, today, 4);
    expect(stats.weekly.map((w) => w.weekStart)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(stats.weekly.map((w) => w.count)).toEqual([0, 1, 0, 2]);
    expect(stats.byCategory[0]).toEqual({ category: "dairy", count: 2, costCents: 150 });
    expect(stats.byReason[0].count).toBe(2);
  });

  it("handles January's previous month", () => {
    const stats = computeWasteStats([{ ...entries[0], discarded_on: "2025-12-15" }], "2026-01-10");
    expect(stats.lastMonth.count).toBe(1);
  });
});

describe("product validation", () => {
  const valid = {
    name: "  Milk ",
    quantity: "1.5",
    unit: "l",
    category: "dairy",
    storage: "fridge",
    purchased_on: "2026-11-01",
    expires_on: "2026-11-08",
    price_cents: 149,
    notes: "",
  };

  it("trims, coerces and normalises input", () => {
    const result = productSchema.parse(valid);
    expect(result).toMatchObject({ name: "Milk", quantity: 1.5, notes: null });
  });

  it("rejects an expiry date before the purchase date", () => {
    const result = productSchema.safeParse({ ...valid, expires_on: "2026-10-30" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["expires_on"]);
  });

  it("rejects impossible dates, units and quantities", () => {
    expect(productSchema.safeParse({ ...valid, expires_on: "2026-02-30" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, unit: "bushel" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, quantity: "0" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, quantity: "abc" }).success).toBe(false);
  });
});
