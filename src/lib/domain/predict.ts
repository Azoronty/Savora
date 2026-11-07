/**
 * Predictive Kitchen: transparent statistics over the household's own
 * history (bought / used / wasted events). No external AI. Every figure is
 * derived from recorded events; with too little history the result says so
 * instead of guessing.
 */
import { UNIT_LABEL, type Unit } from "./constants";
import { daysBetween, type IsoDate } from "./dates";

export type HistoryEvent = {
  item_key: string;
  item_name: string;
  kind: "bought" | "used" | "wasted";
  quantity: number;
  unit: Unit;
  price_cents: number | null;
  occurred_on: IsoDate;
  days_held: number | null;
};

export type StockItem = {
  id: string;
  name: string;
  item_key: string | null;
  quantity: number;
  unit: Unit;
  purchased_on: IsoDate | null;
  expires_on: IsoDate;
};

export type Confidence = "low" | "medium" | "high";

export type ItemPattern = {
  key: string;
  name: string;
  unit: Unit;
  purchases: number;
  avgPurchase: number;
  /** Median days between purchases; null with fewer than two purchases. */
  intervalDays: number | null;
  lastBought: IsoDate | null;
  used: number;
  wasted: number;
  /** Share of known outcomes (used + wasted) that was thrown away. */
  wasteShare: number | null;
  /** Average days from purchase until an amount was used. */
  daysToUse: number | null;
  /** Value of wasted amounts, only from recorded prices. */
  wastedValueCents: number | null;
  confidence: Confidence;
  enoughData: boolean;
};

export type QuantitySuggestion = {
  key: string;
  name: string;
  unit: Unit;
  usual: number;
  suggested: number;
  wasteShare: number;
  purchases: number;
  reason: string;
};

export type WasteRisk = {
  productId: string;
  name: string;
  level: "high" | "medium";
  reason: string;
};

/** Rules, kept together so the UI and README can state them exactly. */
export const PREDICT_RULES = {
  minPurchases: 2,
  overbuyMinPurchases: 3,
  overbuyMinWasteShare: 0.2,
  overbuyMinWasteEvents: 2,
  highRiskWasteShare: 0.4,
} as const;

const keyOf = (key: string, unit: Unit) => `${key}|${unit}`;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

/** Round to a sensible shopping step for the unit, never below one step. */
export function roundToStep(value: number, unit: Unit): number {
  const step = unit === "l" ? (value < 1 ? 0.25 : 0.5) : unit === "kg" ? 0.25 : unit === "g" || unit === "ml" ? (value < 200 ? 25 : 50) : 1;
  return Math.max(step, Math.round(value / step) * step);
}

export function buildPatterns(events: HistoryEvent[]): ItemPattern[] {
  const groups = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const k = keyOf(e.item_key, e.unit);
    const list = groups.get(k);
    if (list) list.push(e);
    else groups.set(k, [e]);
  }

  const patterns: ItemPattern[] = [];
  for (const list of groups.values()) {
    const bought = list.filter((e) => e.kind === "bought").sort((a, b) => (a.occurred_on < b.occurred_on ? -1 : 1));
    const used = list.filter((e) => e.kind === "used");
    const wasted = list.filter((e) => e.kind === "wasted");
    if (bought.length === 0 && used.length === 0 && wasted.length === 0) continue;

    const usedQty = used.reduce((s, e) => s + e.quantity, 0);
    const wastedQty = wasted.reduce((s, e) => s + e.quantity, 0);
    const outcomes = usedQty + wastedQty;
    const gaps = bought.slice(1).map((e, i) => daysBetween(bought[i].occurred_on, e.occurred_on));
    const priced = wasted.filter((e) => e.price_cents !== null);
    const held = used.map((e) => e.days_held).filter((d): d is number => d !== null);
    const purchases = bought.length;
    const outcomeEvents = used.length + wasted.length;

    patterns.push({
      key: list[0].item_key,
      name: (bought[bought.length - 1] ?? list[0]).item_name,
      unit: list[0].unit,
      purchases,
      avgPurchase: mean(bought.map((e) => e.quantity)) ?? 0,
      intervalDays: median(gaps),
      lastBought: bought.length ? bought[bought.length - 1].occurred_on : null,
      used: usedQty,
      wasted: wastedQty,
      wasteShare: outcomes > 0 ? wastedQty / outcomes : null,
      daysToUse: mean(held),
      wastedValueCents: priced.length ? priced.reduce((s, e) => s + (e.price_cents ?? 0), 0) : null,
      confidence: purchases >= 4 && outcomeEvents >= 4 ? "high" : purchases >= 2 && outcomeEvents >= 2 ? "medium" : "low",
      enoughData: purchases >= PREDICT_RULES.minPurchases && outcomeEvents >= 2,
    });
  }
  return patterns.sort((a, b) => b.purchases - a.purchases || a.name.localeCompare(b.name));
}

const fmt = (n: number, unit: Unit) => `${Math.round(n * 100) / 100} ${UNIT_LABEL[unit]}`;
const pct = (share: number) => `${Math.round(share * 100)}%`;

/**
 * Overbuy detection → smart quantity: when an item is bought repeatedly and a
 * steady share of it is thrown away, suggest buying roughly what gets used.
 */
export function suggestQuantities(patterns: ItemPattern[]): QuantitySuggestion[] {
  const out: QuantitySuggestion[] = [];
  for (const p of patterns) {
    if (p.purchases < PREDICT_RULES.overbuyMinPurchases || p.wasteShare === null) continue;
    if (p.wasteShare < PREDICT_RULES.overbuyMinWasteShare) continue;
    if (p.wasted <= 0) continue;
    const suggested = roundToStep(p.avgPurchase * (1 - p.wasteShare), p.unit);
    if (suggested >= p.avgPurchase) continue;
    out.push({
      key: p.key,
      name: p.name,
      unit: p.unit,
      usual: p.avgPurchase,
      suggested,
      wasteShare: p.wasteShare,
      purchases: p.purchases,
      reason: `Bought ${p.purchases} times, usually ${fmt(p.avgPurchase, p.unit)}. About ${pct(p.wasteShare)} of it was thrown away, so ${fmt(suggested, p.unit)} would cover what you actually use.`,
    });
  }
  return out.sort((a, b) => b.wasteShare - a.wasteShare);
}

/**
 * Waste prediction for what is in stock now. Needs history for the item:
 * compares how long the household usually takes to use it with the days left
 * on the date, and how often it has been thrown away before.
 */
export function predictWasteRisk(stock: StockItem[], patterns: ItemPattern[], today: IsoDate): WasteRisk[] {
  const byKey = new Map(patterns.map((p) => [keyOf(p.key, p.unit), p]));
  const risks: WasteRisk[] = [];
  for (const item of stock) {
    if (!item.item_key) continue;
    const p = byKey.get(keyOf(item.item_key, item.unit));
    if (!p || !p.enoughData) continue;
    const daysLeft = daysBetween(today, item.expires_on);
    if (daysLeft < 0) continue; // already past date: shown by expiry tracking, not predicted
    const heldSoFar = item.purchased_on ? Math.max(0, daysBetween(item.purchased_on, today)) : 0;
    const remaining = p.daysToUse !== null ? p.daysToUse - heldSoFar : null;

    if (remaining !== null && remaining > daysLeft + 1) {
      risks.push({
        productId: item.id,
        name: item.name,
        level: "high",
        reason: `You usually take about ${Math.round(p.daysToUse!)} days to use ${p.name.toLowerCase()}; this one has ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.`,
      });
    } else if (p.wasteShare !== null && p.wasteShare >= PREDICT_RULES.highRiskWasteShare && daysLeft <= 3) {
      risks.push({
        productId: item.id,
        name: item.name,
        level: "high",
        reason: `${pct(p.wasteShare)} of past ${p.name.toLowerCase()} was thrown away, and the date is ${daysLeft === 0 ? "today" : `in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`}.`,
      });
    } else if (p.wasteShare !== null && p.wasteShare >= PREDICT_RULES.overbuyMinWasteShare && daysLeft <= 5) {
      risks.push({
        productId: item.id,
        name: item.name,
        level: "medium",
        reason: `Some past ${p.name.toLowerCase()} went unused (${pct(p.wasteShare)}). Plan a meal for it in the next ${daysLeft || 1} days.`,
      });
    }
  }
  return risks.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
}

export type Prediction = {
  patterns: ItemPattern[];
  suggestions: QuantitySuggestion[];
  risks: WasteRisk[];
  /** Items seen but without enough history for any prediction. */
  learning: ItemPattern[];
  totalEvents: number;
};

export function predictKitchen(events: HistoryEvent[], stock: StockItem[], today: IsoDate): Prediction {
  const patterns = buildPatterns(events);
  return {
    patterns,
    suggestions: suggestQuantities(patterns),
    risks: predictWasteRisk(stock, patterns, today),
    learning: patterns.filter((p) => !p.enoughData),
    totalEvents: events.length,
  };
}
