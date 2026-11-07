"use server";

import { idSchema, wasteRecordSchema, type WasteRecordInput } from "@/lib/validation";
import { itemIdentity } from "@/lib/domain/shopping";
import { actionContext, refreshApp } from "./context";
import { dbError, invalid, notSignedIn, ok, type ActionResult } from "./result";

/** Log something thrown away that was never tracked in the inventory. */
export async function logWaste(input: WasteRecordInput): Promise<ActionResult> {
  const parsed = wasteRecordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  if (parsed.data.discarded_on > ctx.viewer.today) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: { discarded_on: "This date is in the future" } };
  }

  const { error } = await ctx.supabase
    .from("waste_records")
    .insert({ ...parsed.data, item_key: itemIdentity(parsed.data.product_name), household_id: ctx.viewer.householdId });
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, "Added to your waste log");
}

export async function deleteWasteRecord(id: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Unknown record." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const { error } = await ctx.supabase.from("waste_records").delete().eq("id", parsed.data);
  if (error) return dbError(error);
  refreshApp();
  return ok(undefined, "Record removed");
}
