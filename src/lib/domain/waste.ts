import type { Category, WasteReason } from "./constants";
import { addDays, startOfWeek, type IsoDate } from "./dates";

export type WasteEntry = {
  category: Category;
  reason: WasteReason;
  discarded_on: IsoDate;
  cost_cents: number | null;
};

export type WasteStats = {
  count: number;
  /** Sum of recorded costs only; entries without a cost are counted separately. */
  costCents: number;
  entriesWithCost: number;
  thisMonth: { count: number; costCents: number };
  lastMonth: { count: number; costCents: number };
  byCategory: { category: Category; count: number; costCents: number }[];
  byReason: { reason: WasteReason; count: number }[];
  weekly: { weekStart: IsoDate; count: number; costCents: number }[];
};

const monthKey = (iso: IsoDate) => iso.slice(0, 7);

function previousMonthKey(iso: IsoDate): string {
  const [y, m] = iso.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Aggregate recorded waste. Every figure comes from entries the household logged. */
export function computeWasteStats(entries: WasteEntry[], today: IsoDate, weeks = 8): WasteStats {
  const thisMonthKey = monthKey(today);
  const lastMonthKey = previousMonthKey(today);
  const currentWeek = startOfWeek(today);
  const weekStarts = Array.from({ length: weeks }, (_, i) => addDays(currentWeek, -7 * (weeks - 1 - i)));
  const weekly = weekStarts.map((weekStart) => ({ weekStart, count: 0, costCents: 0 }));
  const weekIndex = new Map(weekStarts.map((w, i) => [w, i]));

  const categories = new Map<Category, { count: number; costCents: number }>();
  const reasons = new Map<WasteReason, number>();
  const stats: WasteStats = {
    count: entries.length,
    costCents: 0,
    entriesWithCost: 0,
    thisMonth: { count: 0, costCents: 0 },
    lastMonth: { count: 0, costCents: 0 },
    byCategory: [],
    byReason: [],
    weekly,
  };

  for (const entry of entries) {
    const cost = entry.cost_cents ?? 0;
    if (entry.cost_cents !== null) {
      stats.costCents += cost;
      stats.entriesWithCost += 1;
    }
    const month = monthKey(entry.discarded_on);
    if (month === thisMonthKey) {
      stats.thisMonth.count += 1;
      stats.thisMonth.costCents += cost;
    } else if (month === lastMonthKey) {
      stats.lastMonth.count += 1;
      stats.lastMonth.costCents += cost;
    }
    const w = weekIndex.get(startOfWeek(entry.discarded_on));
    if (w !== undefined) {
      weekly[w].count += 1;
      weekly[w].costCents += cost;
    }
    const c = categories.get(entry.category) ?? { count: 0, costCents: 0 };
    categories.set(entry.category, { count: c.count + 1, costCents: c.costCents + cost });
    reasons.set(entry.reason, (reasons.get(entry.reason) ?? 0) + 1);
  }

  stats.byCategory = [...categories]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.count - a.count || b.costCents - a.costCents);
  stats.byReason = [...reasons].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  return stats;
}
