"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/core";
import { actionContext } from "./context";

/** Remember the interface language for a year, and on the profile so push reminders use it too. */
export async function setLang(lang: Lang) {
  if (lang !== "en" && lang !== "ru") return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  const ctx = await actionContext();
  if (ctx) await ctx.supabase.from("profiles").update({ lang }).eq("id", ctx.viewer.userId);
}
