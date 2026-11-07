import { matchCatalog, tokenize } from "./catalog";
import { daysBetween, type IsoDate } from "./dates";

/** Mirrors the database's generated `name_key` column. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Identity used to spot duplicates: the catalog ingredient when recognised
 * (so "Eggs" and "free-range eggs" collide), otherwise the singularised words.
 */
export function itemIdentity(name: string): string {
  return matchCatalog(name)?.key ?? tokenize(name).join(" ");
}

export function findDuplicate<T extends { name: string }>(name: string, items: T[]): T | undefined {
  const identity = itemIdentity(name);
  return items.find((item) => itemIdentity(item.name) === identity);
}

export type StockHint = { name: string; daysLeft: number };

/**
 * Usable stock that already covers a shopping entry — shown as a nudge so
 * people don't buy what they already have. Past-date items don't count.
 */
export function findInStock(
  name: string,
  inventory: { name: string; expires_on: IsoDate }[],
  today: IsoDate,
): StockHint | undefined {
  const identity = itemIdentity(name);
  let best: StockHint | undefined;
  for (const product of inventory) {
    if (itemIdentity(product.name) !== identity) continue;
    const daysLeft = daysBetween(today, product.expires_on);
    if (daysLeft < 0) continue;
    if (!best || daysLeft > best.daysLeft) best = { name: product.name, daysLeft };
  }
  return best;
}
