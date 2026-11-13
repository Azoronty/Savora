import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LANG_COOKIE, makeT, type Lang } from "./core";

/** Language from the switcher cookie, else the browser's preference. */
export const getLang = cache(async (): Promise<Lang> => {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (chosen === "ru" || chosen === "en") return chosen;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^(ru|kk|uz|ky|be|uk)\b/i.test(accept.trim()) ? "ru" : "en";
});

export async function getT() {
  return makeT(await getLang());
}
