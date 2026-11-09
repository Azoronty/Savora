"use server";

import { z } from "zod";
import { planWeek, reminderText } from "@/lib/domain/plan";
import { pushConfigured, sendPush } from "@/lib/push";
import { actionContext } from "./context";
import { dbError, notSignedIn, ok, type ActionResult } from "./result";
import { revalidatePath } from "next/cache";

const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).regex(/^https:\/\/\S+$/),
  p256dh: z.string().min(20).max(200),
  auth: z.string().min(8).max(100),
  userAgent: z.string().max(300).default(""),
});

export async function savePushSubscription(input: z.input<typeof subscriptionSchema>): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This browser sent an invalid subscription." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const { endpoint, p256dh, auth, userAgent } = parsed.data;
  const { error } = await ctx.supabase.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth, p_user_agent: userAgent });
  if (error) return dbError(error);
  revalidatePath("/app/plan");
  return ok(undefined, "Reminders are on for this device");
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const parsed = z.string().max(1000).regex(/^https:\/\/\S+$/).safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: "Unknown device." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const { error } = await ctx.supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data);
  if (error) return dbError(error);
  revalidatePath("/app/plan");
  return ok(undefined, "Reminders are off for this device");
}

export async function setReminderHour(hour: number): Promise<ActionResult> {
  const parsed = z.number().int().min(0).max(23).safeParse(hour);
  if (!parsed.success) return { ok: false, error: "Choose an hour between 0 and 23." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const { error } = await ctx.supabase.from("profiles").update({ reminder_hour: parsed.data }).eq("id", ctx.viewer.userId);
  if (error) return dbError(error);
  revalidatePath("/app/plan");
  return ok(undefined, `Daily reminder set for ${String(parsed.data).padStart(2, "0")}:00`);
}

/** Send today's digest to every device of the signed-in user right now, and log it. */
export async function sendTestReminder(): Promise<ActionResult<{ delivered: number; devices: number }>> {
  if (!pushConfigured()) return { ok: false, error: "Push is not configured on the server yet." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const [subs, products] = await Promise.all([
    ctx.supabase.from("push_subscriptions").select("endpoint, p256dh, auth"),
    ctx.supabase.from("products").select("id, name, expires_on, category, storage, price_cents").eq("household_id", ctx.viewer.householdId),
  ]);
  if (subs.error) return dbError(subs.error);
  if (products.error) return dbError(products.error);
  if (subs.data.length === 0) return { ok: false, error: "Turn on reminders on this device first." };

  const text = reminderText(planWeek(products.data, ctx.viewer.today));
  const results = await sendPush(subs.data, { ...text, tag: "savora-test" });
  const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
  if (gone.length) await ctx.supabase.from("push_subscriptions").delete().in("endpoint", gone);
  const delivered = results.filter((r) => r.ok).length;

  const { error } = await ctx.supabase.from("reminder_log").insert({
    user_id: ctx.viewer.userId,
    kind: "test",
    local_date: ctx.viewer.today,
    devices: subs.data.length,
    delivered,
    title: text.title,
  });
  if (error) return dbError(error);
  revalidatePath("/app/plan");
  if (!delivered) return { ok: false, error: "The push service did not accept the message. Turn reminders off and on again." };
  return ok({ delivered, devices: subs.data.length }, `Reminder sent to ${delivered} of ${subs.data.length} device${subs.data.length === 1 ? "" : "s"}`);
}
