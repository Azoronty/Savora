"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { isValidTimeZone } from "@/lib/domain/dates";
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
