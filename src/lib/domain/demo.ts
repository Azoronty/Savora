import type { Category, Storage, Unit, WasteReason } from "./constants";
import { addDays, type IsoDate } from "./dates";
import { itemIdentity } from "./shopping";

/**
 * Sample kitchen for demo accounts. Dates are relative to the viewer's today
 * so the demo always shows a realistic mix of statuses. Every row is stored
 * with is_demo = true and labelled as sample data in the UI.
 */

type DemoProduct = {
  name: string;
  quantity: number;
  unit: Unit;
  category: Category;
  storage: Storage;
  boughtDaysAgo: number;
  expiresIn: number;
  priceCents: number | null;
  notes?: string;
};

const PRODUCTS: DemoProduct[] = [
  { name: "Baby spinach", quantity: 150, unit: "g", category: "vegetables", storage: "fridge", boughtDaysAgo: 4, expiresIn: 1, priceCents: 249 },
  { name: "Free-range eggs", quantity: 6, unit: "pcs", category: "dairy", storage: "fridge", boughtDaysAgo: 6, expiresIn: 9, priceCents: 389 },
  { name: "Feta", quantity: 200, unit: "g", category: "dairy", storage: "fridge", boughtDaysAgo: 5, expiresIn: 3, priceCents: 329 },
  { name: "Chicken thighs", quantity: 500, unit: "g", category: "meat", storage: "fridge", boughtDaysAgo: 1, expiresIn: 2, priceCents: 649, notes: "Freeze if not cooked by Thursday" },
  { name: "Cherry tomatoes", quantity: 250, unit: "g", category: "vegetables", storage: "pantry", boughtDaysAgo: 3, expiresIn: 2, priceCents: 279 },
  { name: "Greek yogurt", quantity: 500, unit: "g", category: "dairy", storage: "fridge", boughtDaysAgo: 8, expiresIn: 0, priceCents: 299 },
  { name: "Ripe bananas", quantity: 3, unit: "pcs", category: "fruits", storage: "pantry", boughtDaysAgo: 5, expiresIn: 1, priceCents: 119 },
  { name: "Whole milk", quantity: 2, unit: "l", category: "dairy", storage: "fridge", boughtDaysAgo: 9, expiresIn: -1, priceCents: 149 },
  { name: "Sourdough loaf", quantity: 1, unit: "pcs", category: "bakery", storage: "pantry", boughtDaysAgo: 4, expiresIn: -2, priceCents: 450 },
  { name: "Bell peppers", quantity: 3, unit: "pcs", category: "vegetables", storage: "fridge", boughtDaysAgo: 2, expiresIn: 6, priceCents: 299 },
  { name: "Carrots", quantity: 6, unit: "pcs", category: "vegetables", storage: "fridge", boughtDaysAgo: 3, expiresIn: 18, priceCents: 129 },
  { name: "Red onions", quantity: 4, unit: "pcs", category: "vegetables", storage: "pantry", boughtDaysAgo: 10, expiresIn: 21, priceCents: 159 },
  { name: "Garlic", quantity: 1, unit: "pcs", category: "vegetables", storage: "pantry", boughtDaysAgo: 10, expiresIn: 40, priceCents: 79 },
  { name: "Salmon fillets", quantity: 2, unit: "pcs", category: "fish", storage: "freezer", boughtDaysAgo: 12, expiresIn: 75, priceCents: 899 },
  { name: "Basmati rice", quantity: 1, unit: "kg", category: "grains", storage: "pantry", boughtDaysAgo: 30, expiresIn: 280, priceCents: 349 },
  { name: "Spaghetti", quantity: 500, unit: "g", category: "grains", storage: "pantry", boughtDaysAgo: 20, expiresIn: 300, priceCents: 189 },
  { name: "Chopped tomatoes", quantity: 2, unit: "pcs", category: "other", storage: "pantry", boughtDaysAgo: 20, expiresIn: 400, priceCents: 160 },
  { name: "Rolled oats", quantity: 750, unit: "g", category: "grains", storage: "pantry", boughtDaysAgo: 15, expiresIn: 150, priceCents: 229 },
  // Dates spread over the whole week so the rescue plan has a meal every day,
  // plus two items no recipe uses (pork chops, pears) to show the rescue steps.
  { name: "Strawberries", quantity: 250, unit: "g", category: "fruits", storage: "fridge", boughtDaysAgo: 2, expiresIn: 2, priceCents: 349 },
  { name: "Mushrooms", quantity: 250, unit: "g", category: "vegetables", storage: "fridge", boughtDaysAgo: 2, expiresIn: 3, priceCents: 199 },
  { name: "Pork chops", quantity: 400, unit: "g", category: "meat", storage: "fridge", boughtDaysAgo: 1, expiresIn: 3, priceCents: 599 },
  { name: "Single cream", quantity: 200, unit: "ml", category: "dairy", storage: "fridge", boughtDaysAgo: 3, expiresIn: 4, priceCents: 129 },
  { name: "Wholegrain bread", quantity: 1, unit: "pcs", category: "bakery", storage: "pantry", boughtDaysAgo: 1, expiresIn: 4, priceCents: 299 },
  { name: "Zucchini", quantity: 2, unit: "pcs", category: "vegetables", storage: "fridge", boughtDaysAgo: 2, expiresIn: 4, priceCents: 180 },
  { name: "Pears", quantity: 3, unit: "pcs", category: "fruits", storage: "pantry", boughtDaysAgo: 3, expiresIn: 4, priceCents: 210 },
  { name: "Ground beef", quantity: 500, unit: "g", category: "meat", storage: "fridge", boughtDaysAgo: 0, expiresIn: 5, priceCents: 699 },
  { name: "Broccoli", quantity: 1, unit: "pcs", category: "vegetables", storage: "fridge", boughtDaysAgo: 1, expiresIn: 5, priceCents: 149 },
  { name: "Kefir", quantity: 1, unit: "l", category: "dairy", storage: "fridge", boughtDaysAgo: 2, expiresIn: 5, priceCents: 189 },
  { name: "Mozzarella", quantity: 125, unit: "g", category: "dairy", storage: "fridge", boughtDaysAgo: 1, expiresIn: 6, priceCents: 159 },
  { name: "Green beans", quantity: 250, unit: "g", category: "vegetables", storage: "fridge", boughtDaysAgo: 1, expiresIn: 6, priceCents: 229 },
  { name: "Sweet potatoes", quantity: 2, unit: "pcs", category: "vegetables", storage: "pantry", boughtDaysAgo: 2, expiresIn: 6, priceCents: 240 },
  { name: "Tortilla wraps", quantity: 1, unit: "pack", category: "bakery", storage: "pantry", boughtDaysAgo: 3, expiresIn: 6, priceCents: 189 },
  { name: "Potatoes", quantity: 1, unit: "kg", category: "vegetables", storage: "pantry", boughtDaysAgo: 4, expiresIn: 25, priceCents: 199 },
  { name: "Cheddar", quantity: 200, unit: "g", category: "dairy", storage: "fridge", boughtDaysAgo: 6, expiresIn: 20, priceCents: 349 },
];

const SHOPPING: { name: string; quantity: number; unit: Unit; category: Category; note?: string }[] = [
  { name: "Lemons", quantity: 2, unit: "pcs", category: "fruits" },
  { name: "Cucumber", quantity: 1, unit: "pcs", category: "vegetables" },
  { name: "Parmesan", quantity: 100, unit: "g", category: "dairy", note: "Block, not grated" },
];

const WASTE: { name: string; quantity: number; unit: Unit; category: Category; reason: WasteReason; daysAgo: number; costCents: number | null }[] = [
  { name: "Mixed salad leaves", quantity: 1, unit: "pack", category: "vegetables", reason: "spoiled", daysAgo: 3, costCents: 199 },
  { name: "Strawberries", quantity: 200, unit: "g", category: "fruits", reason: "spoiled", daysAgo: 9, costCents: 250 },
  { name: "Cooked rice", quantity: 300, unit: "g", category: "grains", reason: "leftovers", daysAgo: 12, costCents: null },
  { name: "Double cream", quantity: 150, unit: "ml", category: "dairy", reason: "expired", daysAgo: 17, costCents: 139 },
  { name: "Coriander", quantity: 1, unit: "pack", category: "vegetables", reason: "overbought", daysAgo: 23, costCents: 89 },
  { name: "Bread rolls", quantity: 3, unit: "pcs", category: "bakery", reason: "expired", daysAgo: 30, costCents: 180 },
  { name: "Minced beef", quantity: 250, unit: "g", category: "meat", reason: "expired", daysAgo: 38, costCents: 350 },
];

export function buildDemoData(today: IsoDate) {
  return {
    products: PRODUCTS.map((p) => ({
      name: p.name,
      item_key: itemIdentity(p.name),
      quantity: p.quantity,
      unit: p.unit,
      category: p.category,
      storage: p.storage,
      purchased_on: addDays(today, -p.boughtDaysAgo),
      expires_on: addDays(today, p.expiresIn),
      price_cents: p.priceCents,
      notes: p.notes ?? null,
      is_demo: true,
    })),
    shopping: SHOPPING.map((s) => ({ ...s, note: s.note ?? null, source: "manual" as const, is_demo: true })),
    waste: WASTE.map((w) => ({
      product_name: w.name,
      item_key: itemIdentity(w.name),
      quantity: w.quantity,
      unit: w.unit,
      category: w.category,
      reason: w.reason,
      discarded_on: addDays(today, -w.daysAgo),
      cost_cents: w.costCents,
      is_demo: true,
    })),
  };
}
