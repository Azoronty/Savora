import type { Entry } from "./core";
import { APP } from "./ru/app";
import { DOMAIN } from "./ru/domain";
import { LANDING } from "./ru/landing";
import { RECIPES } from "./ru/recipes";
import { SHELL } from "./ru/shell";

/** Russian, keyed by the English text. Missing keys fall back to English. */
export const RU: Record<string, Entry> = { ...RECIPES, ...DOMAIN, ...LANDING, ...APP, ...SHELL };
