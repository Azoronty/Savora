import { describe, expect, it } from "vitest";
import { matchCatalog } from "../catalog";
import { parseQuickAdd, splitList } from "../quick-add";

const today = "2026-11-09";
const short = (text: string) => parseQuickAdd(text, today).map((i) => [i.key, i.quantity, i.unit]);

describe("Russian catalog matching", () => {
  it.each([
    ["Молоко", "milk"],
    ["яйца", "egg"],
    ["Куриное филе", "chicken"],
    ["томатная паста", "tomato paste"],
    ["макароны", "pasta"],
    ["кокосовое молоко", "coconut milk"],
    ["творожный сыр", "cream cheese"],
    ["сливочное масло", "butter"],
    ["зелёный лук", "spring onion"],
    ["яблочный сок", "orange juice"],
    ["гречка", "buckwheat"],
  ])("%s -> %s", (name, key) => {
    expect(matchCatalog(name)?.key).toBe(key);
  });

  it("keeps English matching as before", () => {
    expect(matchCatalog("Cherry tomatoes 250g")?.key).toBe("tomato");
    expect(matchCatalog("chicken stock")?.key).toBe("stock");
  });
});

describe("quick add parser", () => {
  it("splits on commas, 'and' / 'и', but not decimal commas", () => {
    expect(splitList("молоко 1,5 л, хлеб и яйца")).toEqual(["молоко 1,5 л", "хлеб", "яйца"]);
  });

  it("reads Russian speech", () => {
    expect(short("молоко 2 л, яйца 10, шпинат и полкило фарша")).toEqual([
      ["milk", 2, "l"],
      ["egg", 10, "pcs"],
      ["spinach", 200, "g"],
      ["ground beef", 0.5, "kg"],
    ]);
  });

  it("reads English speech with number words and glued units", () => {
    expect(short("two litres of milk, a dozen eggs, 500g chicken and bananas")).toEqual([
      ["milk", 2, "l"],
      ["egg", 12, "pcs"],
      ["chicken", 500, "g"],
      ["banana", 5, "pcs"],
    ]);
  });

  it("names recognised Russian items by their catalog name", () => {
    expect(parseQuickAdd("полкило фарша, молоко", today).map((i) => i.name)).toEqual(["Ground beef", "Milk"]);
  });

  it("treats a bare number for weighed food as packs", () => {
    expect(short("spinach 2")).toEqual([["spinach", 2, "pack"]]);
  });

  it("fills a typical date and flags unknown foods", () => {
    const [milk, mystery] = parseQuickAdd("milk, драконий фрукт", today);
    expect(milk.expires_on).toBe("2026-11-16");
    expect(milk.recognised).toBe(true);
    expect(mystery).toMatchObject({ name: "Драконий фрукт", recognised: false, category: "other" });
  });

  it("caps the list length", () => {
    expect(parseQuickAdd(Array.from({ length: 50 }, () => "milk").join(","), today)).toHaveLength(30);
  });
});
