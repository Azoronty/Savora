"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { isValidTimeZone } from "@/lib/domain/dates";
import { saviProgress } from "@/lib/domain/savi";
import { TIMEZONE_COOKIE } from "@/lib/data/session";
import { actionContext, refreshApp } from "./context";
import { dbError, notSignedIn, ok, type ActionResult } from "./result";

const modeSchema = z.enum(["full", "quiet", "hidden"]);

export async function setSaviMode(mode: string): Promise<ActionResult> {
  const parsed = modeSchema.safeParse(mode);
  if (!parsed.success) return { ok: false, error: "Unknown setting." };
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  const { error } = await ctx.supabase.from("profiles").update({ savi_mode: parsed.data }).eq("id", ctx.viewer.userId);
  if (error) return dbError(error);
  refreshApp();
  const message = { full: "Savi is back to normal", quiet: "Savi will stay quiet", hidden: "Savi is hidden" }[parsed.data];
  return ok(undefined, message);
}

/** Store the browser's time zone in a cookie (for rendering) and on the profile (for daily XP caps). */
export async function saveTimeZone(zone: string): Promise<ActionResult> {
  if (typeof zone !== "string" || zone.length > 64 || !isValidTimeZone(zone)) return { ok: false, error: "Unknown time zone." };
  (await cookies()).set(TIMEZONE_COOKIE, zone, { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  if (ctx.viewer.profileTimeZone !== zone) {
    const { error } = await ctx.supabase.from("profiles").update({ timezone: zone }).eq("id", ctx.viewer.userId);
    if (error) return dbError(error);
  }
  refreshApp();
  return ok(undefined);
}

/** Demo accounts only: jump Savi to its next stage so a presentation can show the evolution. */
export async function demoLevelUp(): Promise<ActionResult<{ xp: number }>> {
  const ctx = await actionContext();
  if (!ctx) return notSignedIn;
  // The database refuses real accounts too; this check just gives a clear message.
  if (!ctx.viewer.isAnonymous) return { ok: false, error: "Levelling up by button is only available in the demo." };
  const { data, error } = await ctx.supabase.rpc("savi_demo_level_up");
  if (error) return dbError(error);
  refreshApp();
  const stage = saviProgress(Number(data)).stage;
  return ok({ xp: Number(data) }, `Savi reached stage ${stage.n}: ${stage.name}`);
}
