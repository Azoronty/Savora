import { z } from "zod";
import { CATEGORIES, STORAGES, UNITS, WASTE_REASONS } from "@/lib/domain/constants";
import { isIsoDate } from "@/lib/domain/dates";

const isoDate = z.string().refine(isIsoDate, "Enter a valid date");
const name = z.string().trim().min(1, "Enter a name").max(80, "Keep it under 80 characters");
const quantity = z.coerce
  .number({ error: "Enter a number" })
  .positive("Must be more than zero")
  .max(99999, "That's a lot — check the amount")
  .transform((n) => Math.round(n * 100) / 100);
const cents = z.number().int().min(0).max(10_000_000).nullable();
const uuid = z.uuid();

export const productSchema = z
  .object({
    name,
    quantity,
    unit: z.enum(UNITS),
    category: z.enum(CATEGORIES),
    storage: z.enum(STORAGES),
    purchased_on: isoDate.nullable(),
    expires_on: isoDate,
    price_cents: cents,
    notes: z
      .string()
      .trim()
      .max(500, "Keep notes under 500 characters")
      .nullable()
      .transform((v) => (v ? v : null)),
  })
  .refine((p) => !p.purchased_on || p.purchased_on <= p.expires_on, {
    path: ["expires_on"],
    message: "The date can't be before the purchase date",
  });
export type ProductInput = z.input<typeof productSchema>;

export const updateProductSchema = z.object({ id: uuid, values: productSchema });

export const amountSchema = z.object({ id: uuid, quantity });

export const discardSchema = z.object({
  id: uuid,
  quantity,
  reason: z.enum(WASTE_REASONS),
  discarded_on: isoDate,
});

export const shoppingItemSchema = z.object({
  name,
  quantity: quantity.default(1),
  unit: z.enum(UNITS).default("pcs"),
  category: z.enum(CATEGORIES).default("other"),
  note: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .default(null)
    .transform((v) => (v ? v : null)),
});
export type ShoppingItemInput = z.input<typeof shoppingItemSchema>;

export const recipeToListSchema = z.object({ slug: z.string().min(1).max(80) });

export const stockItemsSchema = z.object({
  purchased_on: isoDate,
  items: z
    .array(
      z.object({
        shopping_item_id: uuid,
        name,
        item_key: z.string().trim().min(1).max(80).optional(),
        quantity,
        unit: z.enum(UNITS),
        category: z.enum(CATEGORIES),
        storage: z.enum(STORAGES),
        expires_on: isoDate,
        price_cents: cents,
      }),
    )
    .min(1, "Pick at least one item")
    .max(100),
});
export type StockItemsInput = z.input<typeof stockItemsSchema>;

export const wasteRecordSchema = z.object({
  product_name: name,
  quantity,
  unit: z.enum(UNITS),
  category: z.enum(CATEGORIES),
  reason: z.enum(WASTE_REASONS),
  discarded_on: isoDate,
  cost_cents: cents,
});
export type WasteRecordInput = z.input<typeof wasteRecordSchema>;

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const signUpSchema = credentialsSchema.extend({
  displayName: z.string().trim().max(60).optional(),
});

export const idSchema = uuid;

/** Flatten Zod issues into a field → first message map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
