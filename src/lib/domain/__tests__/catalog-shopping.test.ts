import { describe, expect, it } from "vitest";
import { matchCatalog, searchCatalog, suggestedShelfDays, getCatalogEntry } from "../catalog";
import { findDuplicate, findInStock, normalizeName } from "../shopping";
import { RECIPES } from "../recipes";

describe("catalog matching", () => {
  it.each([
    ["Cherry tomatoes", "tomato"],
    ["Free-range Eggs", "egg"],
    ["Sweet potatoes", "sweet potato"],
    ["Potatoes", "potato"],
    ["Coconut milk 400ml", "coconut milk"],
    ["Whole milk", "milk"],
    ["Chicken stock", "stock"],
    ["Greek yogurt", "yogurt"],
    ["Strawberries", "berries"],
    ["Cream cheese", "cream cheese"],
    ["Chopped tomatoes", "canned tomatoes"],
    ["Spring onions", "spring onion"],
    ["Crème fraîche", "cream"],
  ])("maps %s → %s", (name, key) => {
    expect(matchCatalog(name)?.key).toBe(key);
  });

  it("returns undefined for unknown products", () => {
    expect(matchCatalog("Dishwasher tablets")).toBeUndefined();
    expect(matchCatalog("")).toBeUndefined();
  });

  it("suggests entries for quick add", () => {
    expect(searchCatalog("spin").map((e) => e.key)).toContain("spinach");
    expect(searchCatalog("a")).toEqual([]);
  });

  it("extends shelf life suggestions for freezer storage", () => {
    const chicken = getCatalogEntry("chicken")!;
    expect(suggestedShelfDays(chicken, "fridge")).toBe(2);
    expect(suggestedShelfDays(chicken, "freezer")).toBe(90);
  });

  it("only references known ingredients in recipes", () => {
    for (const recipe of RECIPES) {
      for (const ingredient of recipe.ingredients) {
        for (const key of ingredient.keys) expect(getCatalogEntry(key), `${recipe.slug}: ${key}`).toBeDefined();
      }
    }
  });
});

describe("shopping duplicates", () => {
  it("normalises names like the database", () => {
    expect(normalizeName("  Oat   Milk ")).toBe("oat milk");
  });

  it("treats variants of the same ingredient as duplicates", () => {
    const list = [{ name: "Eggs" }, { name: "Dish soap" }];
    expect(findDuplicate("free-range eggs", list)?.name).toBe("Eggs");
    expect(findDuplicate("dish soaps", list)?.name).toBe("Dish soap");
    expect(findDuplicate("Milk", list)).toBeUndefined();
  });

  it("flags usable stock but ignores past-date items", () => {
    const today = "2026-11-06";
    const inventory = [
      { name: "Whole milk", expires_on: "2026-11-05" },
      { name: "Milk", expires_on: "2026-11-10" },
    ];
    expect(findInStock("milk", inventory, today)).toEqual({ name: "Milk", daysLeft: 4 });
    expect(findInStock("milk", [inventory[0]], today)).toBeUndefined();
  });
});
