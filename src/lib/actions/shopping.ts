"use server";

import { getCatalogEntry } from "@/lib/domain/catalog";
import { pluralize } from "@/lib/domain/format";
import { evaluateRecipe } from "@/lib/domain/recommend";
import { getRecipe } from "@/lib/domain/recipes";
import { findDuplicate } from "@/lib/domain/shopping";
import {
  idSchema,
  recipeToListSchema,
  shoppingItemSchema,
  stockItemsSchema,
  type ShoppingItemInput,
  type StockItemsInput,
} from "@/lib/validation";
import { actionContext, refreshApp } from "./context";
import { dbError, invalid, notSignedIn, ok, type ActionResult } from "./result";

type Ctx = NonNullable<Awaited<ReturnType<typeof actionContext>>>;

async function openItems(ctx: Ctx) {
  const { data, error } = await ctx.supabase
    .from("shopping_items")
    .select("id, name")
    .eq("household_id", ctx.viewer.householdId)
    .is("purchased_at", null);
  return { data: data ?? [], error };
}

export async function addShoppingItem(input: ShoppingItemInput): Promise<ActionResult<{ id: string }>> {
  const parsed = shoppingItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const open = await openItems(ctx);
  if (open.error) return dbError(open.error);
  const duplicate = findDuplicate(parsed.data.name, open.data);
  if (duplicate) return { ok: false, error: `“${duplicate.name}” is already on your list.` };

  const { data, error } = await ctx.supabase
    .from("shopping_items")
    .insert({ ...parsed.data, household_id: ctx.viewer.householdId, source: "manual" })
    .select("id")
    .single();
  if (error) return dbError(error);
  refreshApp();
  return ok(data, `${parsed.data.name} added to your list`);
}

/** Add a recipe's missing main ingredients, skipping anything already listed. */
export async function addMissingFromRecipe(slug: string): Promise<ActionResult<{ added: number }>> {
  const parsed = recipeToListSchema.safeParse({ slug });
  const recipe = parsed.success ? getRecipe(parsed.data.slug) : undefined;
  if (!recipe) return { ok: false, error: "Recipe not found." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const [products, open] = await Promise.all([
    ctx.supabase.from("products").select("id, name, expires_on").eq("household_id", ctx.viewer.householdId),
    openItems(ctx),
  ]);
  if (products.error) return dbError(products.error);
  if (open.error) return dbError(open.error);

  const { missing } = evaluateRecipe(recipe, products.data, ctx.viewer.today);
  const toAdd = missing.filter((m) => !findDuplicate(m.label, open.data));
  if (toAdd.length === 0) {
    return ok({ added: 0 }, missing.length ? "Everything missing is already on your list" : "You have every main ingredient");
  }

  const { error } = await ctx.supabase.from("shopping_items").insert(
    toAdd.map((m) => {
      const entry = getCatalogEntry(m.key);
      return {
        household_id: ctx.viewer.householdId,
        name: m.label,
        quantity: entry?.quantity ?? 1,
        unit: entry?.unit ?? "pcs",
        category: entry?.category ?? "other",
        note: `For ${recipe.title.toLowerCase()} · ${m.amount}`.slice(0, 200),
        source: "recipe" as const,
        source_recipe: recipe.slug,
      };
    }),
  );
  if (error) return dbError(error);
  refreshApp();
  return ok({ added: toAdd.length }, `${pluralize(toAdd.length, "item")} added to your list`);
}

export async function setPurchased(id: string, purchased: boolean): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown item." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { error } = await ctx.supabase
    .from("shopping_items")
    .update({ purchased_at: purchased ? new Date().toISOString() : null })
    .eq("id", parsed.data);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This item is already on your list again." };
    return dbError(error);
  }
  refreshApp();
  return ok(undefined);
}

export async function removeShoppingItem(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown item." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { error } = await ctx.supabase.from("shopping_items").delete().eq("id", parsed.data);
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, "Removed from your list");
}

export async function clearPurchased(): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const { error } = await ctx.supabase
    .from("shopping_items")
    .delete()
    .eq("household_id", ctx.viewer.householdId)
    .not("purchased_at", "is", null);
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, "Cleared bought items");
}

/** Move bought items into the inventory atomically (see stock_purchased_items). */
export async function stockPurchasedItems(input: StockItemsInput): Promise<ActionResult<{ stocked: number }>> {
  const parsed = stockItemsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const tooEarly = parsed.data.items.find((i) => i.expires_on < parsed.data.purchased_on);
  if (tooEarly) return { ok: false, error: `Check the date for ${tooEarly.name}: it's before today.` };

  const { data, error } = await ctx.supabase.rpc("stock_purchased_items", {
    p_items: parsed.data.items,
    p_purchased_on: parsed.data.purchased_on,
  });
  if (error) return dbError(error);
  refreshApp();
  return ok({ stocked: data }, `${pluralize(data, "item")} moved to your inventory`);
}

/**
 * Predictive Kitchen "smart quantity": put the suggested amount on the list,
 * updating an open entry for the same item instead of adding a duplicate.
 */
export async function applySmartQuantity(input: ShoppingItemInput): Promise<ActionResult> {
  const parsed = shoppingItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const open = await openItems(ctx);
  if (open.error) return dbError(open.error);
  const existing = findDuplicate(parsed.data.name, open.data);
  const { error } = existing
    ? await ctx.supabase
        .from("shopping_items")
        .update({ quantity: parsed.data.quantity, unit: parsed.data.unit, note: "Smart quantity from your history" })
        .eq("id", existing.id)
    : await ctx.supabase.from("shopping_items").insert({
        ...parsed.data,
        note: "Smart quantity from your history",
        household_id: ctx.viewer.householdId,
        source: "manual",
      });
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, existing ? `Updated ${existing.name} on your list` : `${parsed.data.name} added with the smarter amount`);
}
