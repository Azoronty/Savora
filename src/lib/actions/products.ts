"use server";

import { amountSchema, discardSchema, idSchema, productSchema, updateProductSchema, type ProductInput } from "@/lib/validation";
import { getRecipe } from "@/lib/domain/recipes";
import { itemIdentity } from "@/lib/domain/shopping";
import { actionContext, refreshApp } from "./context";
import { dbError, invalid, notSignedIn, ok, type ActionResult } from "./result";

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { data, error } = await ctx.supabase
    .from("products")
    .insert({ ...parsed.data, item_key: itemIdentity(parsed.data.name), household_id: ctx.viewer.householdId })
    .select("id")
    .single();
  if (error) return dbError(error);
  refreshApp();
  return ok(data, `${parsed.data.name} added`);
}

export async function updateProduct(id: string, values: ProductInput): Promise<ActionResult> {
  const parsed = updateProductSchema.safeParse({ id, values });
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { error, count } = await ctx.supabase
    .from("products")
    .update({ ...parsed.data.values, item_key: itemIdentity(parsed.data.values.name) }, { count: "exact" })
    .eq("id", parsed.data.id);
  if (error) return dbError(error);
  if (count === 0) return { ok: false, error: "That item no longer exists." };
  refreshApp();
  return ok(undefined, "Changes saved");
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown item." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { error } = await ctx.supabase.from("products").delete().eq("id", parsed.data);
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, "Removed from inventory");
}

/** Mark some or all of a product as used. */
export async function consumeProduct(id: string, quantity: number): Promise<ActionResult> {
  const parsed = amountSchema.safeParse({ id, quantity });
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { error } = await ctx.supabase.rpc("consume_product", {
    p_product_id: parsed.data.id,
    p_quantity: parsed.data.quantity,
  });
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, "Marked as used");
}

/** Throw some or all of a product away and record it in the waste log. */
export async function discardProduct(input: {
  id: string;
  quantity: number;
  reason: string;
  discarded_on: string;
}): Promise<ActionResult> {
  const parsed = discardSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { error } = await ctx.supabase.rpc("discard_product", {
    p_product_id: parsed.data.id,
    p_quantity: parsed.data.quantity,
    p_reason: parsed.data.reason,
    p_discarded_on: parsed.data.discarded_on,
  });
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, "Logged in your waste record");
}

/** "I cooked this": mark the used products and record the recipe (earns Savi XP in the database). */
export async function cookRecipe(slug: string, items: { id: string; quantity: number }[]): Promise<ActionResult<{ used: number }>> {
  const parsed = amountSchema.array().min(1, "Pick at least one item").max(30).safeParse(items);
  if (!parsed.success) return invalid(parsed.error);
  if (!getRecipe(slug)) return { ok: false, error: "Recipe not found." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { data, error } = await ctx.supabase.rpc("cook_recipe", { p_recipe: slug, p_items: parsed.data });
  if (error) return dbError(error);
  refreshApp();
  return ok({ used: data }, `Updated ${data} ${data === 1 ? "item" : "items"} in your inventory`);
}
