import { CATALOG } from "@/lib/domain/catalog";
import { RU_NAME } from "@/lib/domain/quick-add";
import { RU } from "./ru";

/**
 * Tiny dictionary-based i18n. English strings are the keys, so English needs
 * no catalogue and untranslated text simply stays English. Keys with {vars}
 * also match generated sentences ("Last chance for spinach.") as patterns.
 */
export type Lang = "en" | "ru";
export type Vars = Record<string, string | number>;
export type Entry = string | ((v: Record<string, string>) => string);
export type T = (text: string, vars?: Vars) => string;

export const LANG_COOKIE = "savora-lang";
export const LANGS: Lang[] = ["en", "ru"];

/** Russian plural form: 1 продукт, 2 продукта, 5 продуктов. */
export function plural(n: number | string, one: string, few: string, many: string): string {
  const v = Math.abs(Number(n)) % 100;
  const d = v % 10;
  if (v > 10 && v < 20) return many;
  if (d === 1) return one;
  if (d >= 2 && d <= 4) return few;
  return many;
}

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);

// Catalog food names in Russian, as labels ("Soy sauce") and lower case ("soy sauce").
const FOOD: Record<string, string> = {};
for (const entry of CATALOG) {
  const ru = RU_NAME[entry.key];
  if (!ru) continue;
  FOOD[entry.label] = ru;
  FOOD[entry.label.toLowerCase()] = ru.toLowerCase();
}

const PATTERNS = Object.entries(RU)
  .filter(([k]) => k.includes("{"))
  .map(([key, entry]) => {
    const names: string[] = [];
    const source = key
      .split(/(\{\w+\})/)
      .map((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (!m) return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        names.push(m[1]);
        return "(.+?)";
      })
      .join("");
    return { re: new RegExp(`^${source}$`, "s"), names, entry, literal: key.replace(/\{\w+\}/g, "").length };
  })
  // Most literal text first, so the most specific sentence wins over "{name} ({when})".
  .sort((a, b) => b.literal - a.literal);

function render(entry: Entry, v: Record<string, string>): string {
  return typeof entry === "function" ? entry(v) : fill(entry, v);
}

const UNIT_RU: Record<string, string> = { pcs: "шт", g: "г", kg: "кг", ml: "мл", L: "л", l: "л", pack: "уп.", min: "мин", "%": "%" };
/** "2 pcs" → "2 шт", "1.5 kg" → "1,5 кг". */
function quantity(v: string): string | null {
  const m = /^(\d+(?:[.,]\d+)?) ?(pcs|g|kg|ml|L|l|pack|min)$/.exec(v);
  return m ? `${m[1].replace(".", ",")} ${UNIT_RU[m[2]]}` : null;
}

/** Translate a value captured from a sentence: a known word, a food, a quantity, a list "a, b and c", or a nested sentence. */
function value(lang: Lang, v: string): string {
  const hit = RU[v] ?? FOOD[v];
  if (typeof hit === "string") return hit;
  // Lower-cased titles ("for tomato pasta"): look up "Tomato pasta", keep it lower case.
  const cap = RU[v.charAt(0).toUpperCase() + v.slice(1)];
  if (typeof cap === "string") return cap.charAt(0).toLowerCase() + cap.slice(1);
  if (/^\d/.test(v)) return quantity(v) ?? translate(lang, v);
  if (/,| and /.test(v)) {
    const parts = v.split(/, | and /);
    if (parts.length > 1) {
      const out = parts.map((p) => value(lang, p));
      return `${out.slice(0, -1).join(", ")} и ${out[out.length - 1]}`;
    }
  }
  return translate(lang, v);
}

export function translate(lang: Lang, text: string, vars?: Vars): string {
  const v: Record<string, string> = {};
  if (vars) for (const [k, val] of Object.entries(vars)) v[k] = String(val);
  if (lang === "en") return vars ? fill(text, v) : text;

  const exact = RU[text];
  if (exact !== undefined) return render(exact, v);
  if (vars) return fill(text, v);
  const food = FOOD[text] ?? quantity(text);
  if (food) return food;
  for (const p of PATTERNS) {
    const m = p.re.exec(text);
    if (!m) continue;
    const captured: Record<string, string> = {};
    p.names.forEach((name, i) => (captured[name] = value(lang, m[i + 1])));
    return render(p.entry, captured);
  }
  return text;
}

export const makeT = (lang: Lang): T => (text, vars) => translate(lang, text, vars);

/** Locale for Intl formatters. */
export const intlLocale = (lang: Lang) => (lang === "ru" ? "ru-RU" : "en-GB");
