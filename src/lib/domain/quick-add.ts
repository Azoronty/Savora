import { matchCatalog, suggestedShelfDays } from "./catalog";
import type { Category, Storage, Unit } from "./constants";
import { addDays, type IsoDate } from "./dates";

/**
 * Turns one line of speech or text ("молоко 2 л, яйца 10 и шпинат" or
 * "2 litres of milk, a dozen eggs and spinach") into ready-to-save products,
 * filling category, storage, unit and a typical date from the catalog.
 * Deterministic: no AI, no network.
 */

export type QuickItem = {
  name: string;
  key: string | null;
  quantity: number;
  unit: Unit;
  category: Category;
  storage: Storage;
  expires_on: IsoDate;
  /** False when the food isn't in the catalog: the date is a guess and should be checked. */
  recognised: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  half: 0.5, dozen: 12, couple: 2,
  один: 1, одна: 1, одно: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
  пол: 0.5, половина: 0.5, половину: 0.5, десяток: 12, пара: 2, пару: 2,
};

const UNIT_WORDS: [RegExp, Unit][] = [
  [/^(kg|kgs|kilo|kilos|kilogram|kilograms|кг|кило|килограмм\p{L}*)$/u, "kg"],
  [/^(g|gr|gram|grams|gramme|grammes|г|гр|грамм\p{L}*)$/u, "g"],
  [/^(ml|millilitre|millilitres|milliliter|milliliters|мл|миллилитр\p{L}*)$/u, "ml"],
  [/^(l|litre|litres|liter|liters|л|литр\p{L}*)$/u, "l"],
  [/^(pcs|pc|piece|pieces|шт|штук\p{L}*|штуки)$/u, "pcs"],
  [/^(pack|packs|pkg|packet|packets|bag|bags|box|boxes|пачк\p{L}*|упаковк\p{L}*|пакет\p{L}*|коробк\p{L}*)$/u, "pack"],
];
const FILLER = new Set(["of", "x", "и", "and", "the", "some", "немного"]);

const unitOf = (word: string): Unit | undefined => UNIT_WORDS.find(([re]) => re.test(word))?.[1];
const toNumber = (word: string): number | undefined => {
  if (/^\d+([.,]\d+)?$/.test(word)) return Number(word.replace(",", "."));
  return NUMBER_WORDS[word];
};

/** Split on commas (not decimal commas), semicolons, new lines, "+", "and" / "и". */
export function splitList(text: string): string[] {
  return text
    .split(/(?<!\d),|,(?!\d)|[;\n]|\s\+\s?|\s+(?:and|и)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseQuickItem(chunk: string, today: IsoDate): QuickItem | null {
  // "2l" / "500г" / "1,5kg" become "2 l" / "500 г" / "1,5 kg".
  const words = chunk
    .toLowerCase()
    .replace(/(\d)([a-zа-яё])/giu, "$1 $2")
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\d]+|[^\p{L}\d.,]+$/gu, "").replace(/[.,]$/, ""))
    .filter(Boolean);

  let quantity: number | undefined;
  let unit: Unit | undefined;
  const nameWords: string[] = [];
  for (const word of words) {
    const n = toNumber(word);
    if (n !== undefined && quantity === undefined) {
      quantity = n;
      continue;
    }
    if ((word === "dozen" || word === "десяток") && quantity !== undefined) {
      quantity *= 12; // "a dozen", "2 dozen"
      continue;
    }
    const u = unitOf(word);
    if (u && !unit) {
      unit = u;
      continue;
    }
    // "пол-литра", "полкило": a half followed by a unit glued to it.
    const half = /^пол-?(.+)$/u.exec(word);
    if (half && unitOf(half[1]) && quantity === undefined) {
      quantity = 0.5;
      unit = unitOf(half[1]);
      continue;
    }
    if (!FILLER.has(word)) nameWords.push(word);
  }
  if (nameWords.length === 0) return null;

  const name = capitalise(nameWords.join(" ")).slice(0, 80);
  const entry = matchCatalog(name);
  if (!entry) {
    return {
      name,
      key: null,
      quantity: quantity ?? 1,
      unit: unit ?? "pcs",
      category: "other",
      storage: "fridge",
      expires_on: addDays(today, 7),
      recognised: false,
    };
  }

  // A bare number keeps the catalog unit for countable food ("eggs 10", "milk 2");
  // for food sold by weight it means packs ("spinach 2" is two bags, not 2 g).
  let finalUnit = unit ?? entry.unit;
  if (!unit && quantity !== undefined && (entry.unit === "g" || entry.unit === "ml") && quantity < 20) finalUnit = "pack";
  const finalQty = quantity ?? (unit && unit !== entry.unit ? 1 : entry.quantity);

  return {
    // Russian input is stored under the catalog name: the app is in English and
    // speech gives grammatical cases ("полкило фарша"), not clean names.
    name: /[а-я]/i.test(name) ? entry.label : name,
    key: entry.key,
    quantity: Math.max(0.01, Math.min(99999, finalQty)),
    unit: finalUnit,
    category: entry.category,
    storage: entry.storage,
    expires_on: addDays(today, suggestedShelfDays(entry, entry.storage)),
    recognised: true,
  };
}

export function parseQuickAdd(text: string, today: IsoDate, limit = 30): QuickItem[] {
  return splitList(text)
    .map((chunk) => parseQuickItem(chunk, today))
    .filter((i): i is QuickItem => i !== null)
    .slice(0, limit);
}
