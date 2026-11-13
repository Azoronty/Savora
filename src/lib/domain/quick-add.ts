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
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  half: 0.5, dozen: 12, couple: 2,
  один: 1, одна: 1, одно: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
  одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17,
  восемнадцать: 18, девятнадцать: 19, двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70,
  восемьдесят: 80, девяносто: 90, сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500, шестьсот: 600,
  семьсот: 700, восемьсот: 800, девятьсот: 900,
  пол: 0.5, половина: 0.5, половину: 0.5, полтора: 1.5, полторы: 1.5, десяток: 12, пара: 2, пару: 2,
};

/** Display names for Russian input, in the nominative ("полкило фарша" is saved as «Фарш»). */
export const RU_NAME: Record<string, string> = {
  tomato: "Помидоры", spinach: "Шпинат", lettuce: "Салат", cucumber: "Огурцы", "bell pepper": "Болгарский перец",
  onion: "Лук", "spring onion": "Зелёный лук", garlic: "Чеснок", carrot: "Морковь", potato: "Картофель",
  "sweet potato": "Батат", zucchini: "Кабачки", broccoli: "Брокколи", mushroom: "Грибы", avocado: "Авокадо",
  cabbage: "Капуста", eggplant: "Баклажаны", celery: "Сельдерей", "green beans": "Стручковая фасоль",
  parsley: "Петрушка", basil: "Базилик", cilantro: "Кинза", dill: "Укроп", ginger: "Имбирь", chili: "Острый перец",
  peas: "Горошек", corn: "Кукуруза", apple: "Яблоки", banana: "Бананы", lemon: "Лимоны", lime: "Лаймы",
  orange: "Апельсины", berries: "Ягоды", grapes: "Виноград", pear: "Груши", mango: "Манго", milk: "Молоко",
  yogurt: "Йогурт", cheese: "Сыр", mozzarella: "Моцарелла", feta: "Фета", "cream cheese": "Сливочный сыр",
  "cottage cheese": "Творог", cream: "Сливки", butter: "Сливочное масло", egg: "Яйца", kefir: "Кефир",
  chicken: "Курица", "ground beef": "Фарш", beef: "Говядина", pork: "Свинина", bacon: "Бекон", ham: "Ветчина",
  sausage: "Колбаса", turkey: "Индейка", salmon: "Лосось", "white fish": "Белая рыба", shrimp: "Креветки",
  tuna: "Тунец", rice: "Рис", pasta: "Макароны", noodles: "Лапша", oats: "Овсянка", flour: "Мука",
  quinoa: "Киноа", couscous: "Кускус", buckwheat: "Гречка", lentils: "Чечевица", chickpeas: "Нут",
  beans: "Фасоль", bread: "Хлеб", tortilla: "Лаваш", pita: "Пита", "orange juice": "Сок", coffee: "Кофе",
  tea: "Чай", "canned tomatoes": "Консервированные томаты", "tomato paste": "Томатная паста",
  "coconut milk": "Кокосовое молоко", tofu: "Тофу", hummus: "Хумус", pesto: "Песто", stock: "Бульон",
  "soy sauce": "Соевый соус", honey: "Мёд", "peanut butter": "Арахисовая паста",
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
/** "полкило", "пол-литра": a half glued to a unit. */
const halfUnit = (word: string): Unit | undefined => {
  const m = /^пол-?(.+)$/u.exec(word);
  return m ? unitOf(m[1]) : undefined;
};
const isQuantityWord = (w: string) => toNumber(w) !== undefined || halfUnit(w) !== undefined;
// Russian adjective endings: "томатная паста", "яблочный сок" are one product.
const RU_ADJECTIVE = /[а-я]{2,}(ый|ий|ой|ая|яя|ое|ее|ые|ие)$/u;

function toWords(text: string): string[] {
  // "2l" / "500г" / "1,5kg" become "2 l" / "500 г" / "1,5 kg".
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/(\d)([a-zа-я])/giu, "$1 $2")
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\d]+|[^\p{L}\d.,]+$/gu, "").replace(/[.,]$/, ""))
    .filter(Boolean);
}

/**
 * Speech recognisers rarely add commas, so "молоко 2 литра яйца 10 штук шпинат"
 * arrives as one run. Start a new item when a second food appears, or when a
 * number follows a food that already has its amount.
 */
export function segment(words: string[]): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let food: string | undefined;
  let hasQty = false;
  const flush = () => {
    if (cur.length) out.push(cur);
    cur = [];
    food = undefined;
    hasQty = false;
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const qty = isQuantityWord(w);
    const key = qty || unitOf(w) || FILLER.has(w) ? undefined : matchCatalog(w)?.key;
    if (key && food) {
      const prevKey = prev ? matchCatalog(prev)?.key : undefined;
      const combined = prev ? matchCatalog(`${prev} ${w}`)?.key : undefined;
      if (prev && RU_ADJECTIVE.test(prev) && !prevKey && cur.length > 1) {
        // "молоко сливочное масло": the adjective opens the next product.
        const adjective = cur.pop()!;
        flush();
        cur.push(adjective);
      } else if (!(prev && ((RU_ADJECTIVE.test(prev) && prevKey) || (combined !== undefined && combined !== key && combined !== prevKey)))) {
        flush();
      }
    } else if (qty && food && hasQty && !(prev && isQuantityWord(prev))) {
      flush();
    }
    cur.push(w);
    if (key) food = key;
    if (qty) hasQty = true;
  });
  flush();
  return out;
}

/** Split on commas (not decimal commas), semicolons, new lines, "+", "and" / "и". */
export function splitList(text: string): string[] {
  return text
    .split(/(?<!\d),|,(?!\d)|[;\n]|\s\+\s?|\s+(?:and|и)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function parseQuickItem(chunk: string | string[], today: IsoDate): QuickItem | null {
  const words = typeof chunk === "string" ? toWords(chunk) : chunk;

  let quantity: number | undefined;
  let unit: Unit | undefined;
  let lastNumber: number | undefined;
  const nameWords: string[] = [];
  for (const word of words) {
    const n = toNumber(word);
    if (n !== undefined && quantity === undefined) {
      quantity = n;
      lastNumber = n;
      continue;
    }
    // Compound numbers: "двадцать пять", "сто пятьдесят", "twenty five".
    if (n !== undefined && n >= 1 && lastNumber !== undefined && lastNumber >= 20 && n < lastNumber && quantity !== undefined) {
      quantity += n;
      lastNumber = n;
      continue;
    }
    lastNumber = undefined;
    if ((word === "dozen" || word === "десяток") && quantity !== undefined) {
      quantity *= 12; // "a dozen", "2 dozen"
      continue;
    }
    const u = unitOf(word);
    if (u && !unit) {
      unit = u;
      continue;
    }
    const half = halfUnit(word);
    if (half && quantity === undefined) {
      quantity = 0.5;
      unit = half;
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
    // Speech gives grammatical cases ("полкило фарша"); store a clean nominative name.
    name: /[а-я]/i.test(name) ? (RU_NAME[entry.key] ?? entry.label) : name,
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
    .flatMap((chunk) => segment(toWords(chunk)))
    .map((words) => parseQuickItem(words, today))
    .filter((i): i is QuickItem => i !== null)
    .slice(0, limit);
}
