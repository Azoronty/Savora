import { CATEGORY_LABEL, type Category, type Storage } from "./constants";
import { daysBetween, type IsoDate } from "./dates";
import { findInStock } from "./shopping";
import { computeWasteStats, type WasteEntry } from "./waste";

export type Insight = {
  id: string;
  kind: "freeze" | "duplicate" | "past-date" | "waste-pattern";
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

type ProductLike = { id: string; name: string; category: Category; storage: Storage; expires_on: IsoDate };

const FREEZABLE: Category[] = ["meat", "fish", "bakery"];

/**
 * Practical, data-backed suggestions. Each insight is derived from the
 * household's own inventory, shopping list or waste log — nothing invented.
 */
export function buildInsights({
  products,
  shopping,
  waste,
  today,
}: {
  products: ProductLike[];
  shopping: { name: string }[];
  waste: WasteEntry[];
  today: IsoDate;
}): Insight[] {
  const insights: Insight[] = [];

  const pastDate = products.filter((p) => daysBetween(today, p.expires_on) < 0);
  if (pastDate.length > 0) {
    insights.push({
      id: "past-date",
      kind: "past-date",
      title: `${pastDate.length} ${pastDate.length === 1 ? "item is" : "items are"} past the date you entered`,
      body: "Check them before deciding. If something goes in the bin, log it so you can see patterns over time.",
      href: "/app/expiring",
      cta: "Review items",
    });
  }

  const freezeCandidate = products
    .filter((p) => FREEZABLE.includes(p.category) && p.storage === "fridge")
    .map((p) => ({ p, days: daysBetween(today, p.expires_on) }))
    .filter(({ days }) => days >= 0 && days <= 2)
    .sort((a, b) => a.days - b.days)[0];
  if (freezeCandidate) {
    const { p, days } = freezeCandidate;
    insights.push({
      id: `freeze-${p.id}`,
      kind: "freeze",
      title: `Cook or freeze the ${p.name.toLowerCase()}`,
      body: `${days === 0 ? "Its date is today" : `It has ${days} ${days === 1 ? "day" : "days"} left`}. If it won't be cooked in time, freezing it before the date is a simple way to keep it for later.`,
      href: "/app/meals",
      cta: "Find a recipe",
    });
  }

  for (const item of shopping) {
    const stock = findInStock(item.name, products, today);
    if (stock) {
      insights.push({
        id: `dup-${item.name}`,
        kind: "duplicate",
        title: `You may not need ${item.name.toLowerCase()}`,
        body: `It's on your shopping list, but “${stock.name}” is already in stock with ${stock.daysLeft} ${stock.daysLeft === 1 ? "day" : "days"} left.`,
        href: "/app/shopping",
        cta: "Open list",
      });
      break;
    }
  }

  const stats = computeWasteStats(waste, today);
  const recent = stats.thisMonth.count + stats.lastMonth.count;
  if (recent >= 3 && stats.byCategory[0]) {
    const top = stats.byCategory[0];
    insights.push({
      id: "waste-pattern",
      kind: "waste-pattern",
      title: `${CATEGORY_LABEL[top.category]} lead your waste log`,
      body: `${top.count} of the ${stats.count} items you've logged were ${CATEGORY_LABEL[top.category].toLowerCase()}. Buying smaller amounts more often can help.`,
      href: "/app/waste",
      cta: "See waste log",
    });
  }

  return insights;
}
