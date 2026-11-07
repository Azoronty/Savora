import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Category = Enums["product_category"];
export type Storage = Enums["storage_location"];
export type Unit = Enums["quantity_unit"];
export type WasteReason = Enums["waste_reason"];

export const CATEGORIES = [
  "vegetables",
  "fruits",
  "dairy",
  "meat",
  "fish",
  "grains",
  "bakery",
  "drinks",
  "other",
] as const satisfies readonly Category[];

export const STORAGES = ["fridge", "freezer", "pantry"] as const satisfies readonly Storage[];
export const UNITS = ["pcs", "g", "kg", "ml", "l", "pack"] as const satisfies readonly Unit[];
export const WASTE_REASONS = [
  "expired",
  "spoiled",
  "leftovers",
  "overbought",
  "other",
] as const satisfies readonly WasteReason[];

export const CATEGORY_LABEL: Record<Category, string> = {
  vegetables: "Vegetables",
  fruits: "Fruits",
  dairy: "Dairy",
  meat: "Meat",
  fish: "Fish",
  grains: "Grains",
  bakery: "Bakery",
  drinks: "Drinks",
  other: "Other",
};

export const STORAGE_LABEL: Record<Storage, string> = {
  fridge: "Refrigerator",
  freezer: "Freezer",
  pantry: "Pantry",
};

export const UNIT_LABEL: Record<Unit, string> = {
  pcs: "pcs",
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "L",
  pack: "pack",
};

export const WASTE_REASON_LABEL: Record<WasteReason, string> = {
  expired: "Past its date",
  spoiled: "Spoiled early",
  leftovers: "Leftovers",
  overbought: "Bought too much",
  other: "Other",
};

/** Products within this many days of their date are flagged "use soon". */
export const USE_SOON_DAYS = 3;

/** Prices are stored in minor units; one display currency keeps the MVP simple. */
export const CURRENCY = "USD";
