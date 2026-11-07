"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildDemoData } from "@/lib/domain/demo";
import { isValidTimeZone, todayIn } from "@/lib/domain/dates";
import { TIMEZONE_COOKIE } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { credentialsSchema, signUpSchema } from "@/lib/validation";
import { actionContext, refreshApp } from "./context";
import { dbError, invalid, notSignedIn, ok, type ActionResult } from "./result";

type Client = SupabaseClient<Database>;

/** Only allow same-site relative redirects after sign-in. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/app") && !next.startsWith("//") ? next : "/app";
}

async function viewerToday(): Promise<string> {
  return todayIn((await cookies()).get(TIMEZONE_COOKIE)?.value ?? "UTC");
}

async function seedDemo(supabase: Client, householdId: string, today: string) {
  const demo = buildDemoData(today);
  const withHousehold = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, household_id: householdId }));
  const results = await Promise.all([
    supabase.from("products").insert(withHousehold(demo.products)),
    supabase.from("shopping_items").insert(withHousehold(demo.shopping)),
    supabase.from("waste_records").insert(withHousehold(demo.waste)),
    // Sample purchase history for Predictive Kitchen (flagged as demo data).
    supabase.rpc("seed_demo_history"),
  ]);
  return results.find((r) => r.error)?.error ?? null;
}

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "That email and password don't match an account." };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName ?? null } },
  });
  if (error) {
    const taken = error.code === "user_already_exists" || error.code === "email_exists";
    return { ok: false, error: taken ? "An account with this email already exists. Try signing in." : error.message };
  }
  if (!data.session) {
    return ok(undefined, "Check your inbox to confirm your email, then sign in.");
  }
  redirect("/app/welcome");
}

/** One-click demo: an anonymous account with a clearly labelled sample kitchen. */
export async function startDemo(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { household_name: "Demo kitchen" } },
  });
  if (error || !data.user) {
    console.error("[savora] demo sign-in failed", error?.message);
    return { ok: false, error: "The demo is busy right now. Please try again in a minute." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", data.user.id)
    .single();
  if (profileError) return dbError(profileError);

  const zone = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  if (zone && isValidTimeZone(zone)) await supabase.from("profiles").update({ timezone: zone }).eq("id", data.user.id);
  const seedError = await seedDemo(supabase, profile.household_id, await viewerToday());
  if (seedError) return dbError(seedError, "We couldn't prepare the demo kitchen.");
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", data.user.id);
  redirect("/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const onboardingSchema = z.object({
  householdName: z.string().trim().min(1, "Give your kitchen a name").max(60),
  withSample: z.boolean(),
});

export async function completeOnboarding(input: z.input<typeof onboardingSchema>): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;

  const rename = await ctx.supabase
    .from("households")
    .update({ name: parsed.data.householdName })
    .eq("id", ctx.viewer.householdId);
  if (rename.error) return dbError(rename.error);

  if (parsed.data.withSample) {
    const seedError = await seedDemo(ctx.supabase, ctx.viewer.householdId, ctx.viewer.today);
    if (seedError) return dbError(seedError, "We couldn't add the sample kitchen.");
  }

  const done = await ctx.supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", ctx.viewer.userId);
  if (done.error) return dbError(done.error);
  refreshApp();
  redirect("/app");
}

/** Remove every sample row, leaving the household's real data untouched. */
export async function clearSampleData(): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const { householdId } = ctx.viewer;
  const results = await Promise.all([
    ...(["products", "shopping_items", "waste_records"] as const).map((table) =>
      ctx.supabase.from(table).delete().eq("household_id", householdId).eq("is_demo", true),
    ),
    ctx.supabase.rpc("clear_demo_history"),
  ]);
  const failed = results.find((r) => r.error)?.error;
  if (failed) return dbError(failed);
  refreshApp();
  return ok(undefined, "Sample data removed");
}

export async function loadSampleData(): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const seedError = await seedDemo(ctx.supabase, ctx.viewer.householdId, ctx.viewer.today);
  if (seedError) return dbError(seedError, "We couldn't add the sample kitchen. Clear existing sample data first.");
  refreshApp();
  return ok(undefined, "Sample kitchen added");
}
