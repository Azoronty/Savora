"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/core";

/** Remember the interface language for a year. */
export async function setLang(lang: Lang) {
  if (lang !== "en" && lang !== "ru") return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 31_536_000, sameSite: "lax" });
}
