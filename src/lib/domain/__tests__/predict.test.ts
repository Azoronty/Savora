import { describe, expect, it } from "vitest";
import { buildPatterns, predictKitchen, predictWasteRisk, roundToStep, suggestQuantities, type HistoryEvent } from "../predict";

const today = "2026-11-08";
const ev = (kind: HistoryEvent["kind"], quantity: number, occurred_on: string, extra: Partial<HistoryEvent> = {}): HistoryEvent => ({
  item_key: "milk",
  item_name: "Whole milk",
  kind,
  quantity,
  unit: "l",
  price_cents: null,
  occurred_on,
  days_held: kind === "used" ? 6 : null,
  ...extra,
});

const milkHistory: HistoryEvent[] = [
  ev("bought", 2, "2026-10-04"), ev("used", 1.3, "2026-10-10"), ev("wasted", 0.7, "2026-10-11", { price_cents: 104 }),
  ev("bought", 2, "2026-10-11"), ev("used", 1.5, "2026-10-17"), ev("wasted", 0.5, "2026-10-18", { price_cents: 74 }),
  ev("bought", 2, "2026-10-18"), ev("used", 1.2, "2026-10-24"), ev("wasted", 0.8, "2026-10-25", { price_cents: 119 }),
  ev("bought", 2, "2026-10-25"), ev("used", 1.4, "2026-10-30"), ev("wasted", 0.6, "2026-10-31", { price_cents: 89 }),
];

describe("purchase and consumption patterns", () => {
  it("summarises purchases, rhythm, use and waste from events", () => {
    const [milk] = buildPatterns(milkHistory);
    expect(milk).toMatchObject({ key: "milk", purchases: 4, avgPurchase: 2, intervalDays: 7, lastBought: "2026-10-25", confidence: "high", enoughData: true });
    expect(milk.used).toBeCloseTo(5.4);
    expect(milk.wasted).toBeCloseTo(2.6);
    expect(milk.wasteShare).toBeCloseTo(2.6 / 8);
    expect(milk.daysToUse).toBe(6);
    expect(milk.wastedValueCents).toBe(386);
  });

  it("keeps different units apart and reports missing data honestly", () => {
    const [p] = buildPatterns([ev("bought", 1, "2026-11-01", { unit: "pcs", item_key: "bread", item_name: "Bread" })]);
    expect(p).toMatchObject({ purchases: 1, intervalDays: null, wasteShare: null, daysToUse: null, wastedValueCents: null, confidence: "low", enoughData: false });
  });
});

describe("overbuy detection and smart quantity", () => {
  it("suggests buying roughly what gets used", () => {
    const [s] = suggestQuantities(buildPatterns(milkHistory));
    expect(s).toMatchObject({ key: "milk", usual: 2, suggested: 1.5, purchases: 4 });
    expect(s.reason).toContain("Bought 4 times");
  });

  it("stays silent without enough purchases or waste", () => {
    expect(suggestQuantities(buildPatterns(milkHistory.slice(0, 6)))).toEqual([]); // only 2 purchases
    const noWaste = milkHistory.filter((e) => e.kind !== "wasted");
    expect(suggestQuantities(buildPatterns(noWaste))).toEqual([]);
  });

  it("rounds to shopping-friendly steps", () => {
    expect(roundToStep(1.37, "l")).toBe(1.5);
    expect(roundToStep(0.3, "l")).toBe(0.25);
    expect(roundToStep(130, "g")).toBe(125);
    expect(roundToStep(4.4, "pcs")).toBe(4);
    expect(roundToStep(0.1, "pcs")).toBe(1);
  });
});

describe("waste prediction for current stock", () => {
  const patterns = buildPatterns(milkHistory);
  const stock = (expires_on: string, purchased_on = "2026-11-07") => [
    { id: "p1", name: "Whole milk", item_key: "milk", quantity: 2, unit: "l" as const, purchased_on, expires_on },
  ];

  it("flags items that usually take longer to use than the days left", () => {
    const [risk] = predictWasteRisk(stock("2026-11-10"), patterns, today); // 2 days left, ~5 days still needed
    expect(risk).toMatchObject({ productId: "p1", level: "high" });
    expect(risk.reason).toMatch(/usually take about 6 days/);
  });

  it("does not predict for items without history or already past date", () => {
    expect(predictWasteRisk(stock("2026-11-20"), [], today)).toEqual([]);
    expect(predictWasteRisk(stock("2026-11-07"), patterns, today)).toEqual([]);
    expect(predictWasteRisk([{ ...stock("2026-11-10")[0], item_key: null }], patterns, today)).toEqual([]);
  });

  it("combines everything and lists items still being learned", () => {
    const p = predictKitchen([...milkHistory, ev("bought", 1, "2026-11-01", { item_key: "bread", item_name: "Bread", unit: "pcs" })], stock("2026-11-10"), today);
    expect(p.suggestions).toHaveLength(1);
    expect(p.risks).toHaveLength(1);
    expect(p.learning.map((l) => l.key)).toEqual(["bread"]);
  });
});
