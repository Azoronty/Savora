import type { Category, Storage, Unit } from "./constants";

/**
 * Known foods. Each entry is an ingredient key used by the recipe dataset and
 * provides sensible defaults for quick entry. `shelfDays` is a typical,
 * deliberately conservative figure used only to pre-fill the date field — the
 * UI always asks people to use the date printed on the package.
 */
export type CatalogEntry = {
  key: string;
  label: string;
  aliases: string[];
  category: Category;
  storage: Storage;
  shelfDays: number;
  unit: Unit;
  quantity: number;
};

type Row = [key: string, aliases: string[], Category, Storage, shelfDays: number, Unit, quantity: number];

const ROWS: Row[] = [
  // Vegetables
  ["tomato", ["tomato", "cherry tomato", "plum tomato"], "vegetables", "pantry", 6, "pcs", 4],
  ["spinach", ["spinach", "baby spinach"], "vegetables", "fridge", 5, "g", 200],
  ["lettuce", ["lettuce", "romaine", "salad leaf", "mixed salad", "rocket", "arugula"], "vegetables", "fridge", 5, "pcs", 1],
  ["cucumber", ["cucumber"], "vegetables", "fridge", 7, "pcs", 2],
  ["bell pepper", ["bell pepper", "sweet pepper", "capsicum", "red pepper"], "vegetables", "fridge", 7, "pcs", 2],
  ["onion", ["onion", "red onion", "yellow onion", "shallot"], "vegetables", "pantry", 30, "pcs", 3],
  ["spring onion", ["spring onion", "green onion", "scallion"], "vegetables", "fridge", 7, "pack", 1],
  ["garlic", ["garlic"], "vegetables", "pantry", 60, "pcs", 1],
  ["carrot", ["carrot"], "vegetables", "fridge", 21, "pcs", 4],
  ["potato", ["potato", "baby potato"], "vegetables", "pantry", 30, "kg", 1],
  ["sweet potato", ["sweet potato", "yam"], "vegetables", "pantry", 21, "pcs", 2],
  ["zucchini", ["zucchini", "courgette"], "vegetables", "fridge", 7, "pcs", 2],
  ["broccoli", ["broccoli", "tenderstem"], "vegetables", "fridge", 5, "pcs", 1],
  ["mushroom", ["mushroom", "champignon", "chestnut mushroom"], "vegetables", "fridge", 5, "g", 250],
  ["avocado", ["avocado"], "vegetables", "pantry", 4, "pcs", 2],
  ["cabbage", ["cabbage"], "vegetables", "fridge", 21, "pcs", 1],
  ["eggplant", ["eggplant", "aubergine"], "vegetables", "fridge", 6, "pcs", 1],
  ["celery", ["celery"], "vegetables", "fridge", 14, "pcs", 1],
  ["green beans", ["green bean", "french bean"], "vegetables", "fridge", 5, "g", 250],
  ["parsley", ["parsley"], "vegetables", "fridge", 6, "pack", 1],
  ["basil", ["basil"], "vegetables", "fridge", 5, "pack", 1],
  ["cilantro", ["cilantro", "coriander"], "vegetables", "fridge", 6, "pack", 1],
  ["dill", ["dill"], "vegetables", "fridge", 6, "pack", 1],
  ["ginger", ["ginger"], "vegetables", "fridge", 21, "pcs", 1],
  ["chili", ["chili", "chilli", "jalapeno"], "vegetables", "fridge", 10, "pcs", 2],
  ["peas", ["pea", "frozen pea", "green pea"], "vegetables", "freezer", 180, "g", 400],
  ["corn", ["corn", "sweetcorn"], "vegetables", "pantry", 365, "pcs", 1],
  // Fruits
  ["apple", ["apple"], "fruits", "fridge", 30, "pcs", 4],
  ["banana", ["banana"], "fruits", "pantry", 5, "pcs", 5],
  ["lemon", ["lemon"], "fruits", "fridge", 21, "pcs", 2],
  ["lime", ["lime"], "fruits", "fridge", 21, "pcs", 2],
  ["orange", ["orange", "mandarin", "clementine"], "fruits", "pantry", 14, "pcs", 4],
  ["berries", ["berry", "strawberry", "blueberry", "raspberry", "blackberry"], "fruits", "fridge", 4, "g", 250],
  ["grapes", ["grape"], "fruits", "fridge", 7, "g", 500],
  ["pear", ["pear"], "fruits", "pantry", 5, "pcs", 3],
  ["mango", ["mango"], "fruits", "pantry", 5, "pcs", 1],
  // Dairy & eggs
  ["milk", ["milk", "whole milk", "oat milk", "almond milk"], "dairy", "fridge", 7, "l", 1],
  ["yogurt", ["yogurt", "yoghurt", "greek yogurt", "skyr"], "dairy", "fridge", 14, "g", 500],
  ["cheese", ["cheese", "cheddar", "parmesan", "gouda", "emmental", "pecorino"], "dairy", "fridge", 21, "g", 200],
  ["mozzarella", ["mozzarella", "burrata"], "dairy", "fridge", 7, "g", 125],
  ["feta", ["feta", "halloumi"], "dairy", "fridge", 10, "g", 200],
  ["cream cheese", ["cream cheese", "ricotta", "mascarpone"], "dairy", "fridge", 10, "g", 200],
  ["cottage cheese", ["cottage cheese", "tvorog", "quark"], "dairy", "fridge", 7, "g", 300],
  ["cream", ["cream", "heavy cream", "sour cream", "creme fraiche", "double cream"], "dairy", "fridge", 7, "ml", 200],
  ["butter", ["butter"], "dairy", "fridge", 45, "g", 250],
  ["egg", ["egg", "free range egg"], "dairy", "fridge", 21, "pcs", 10],
  ["kefir", ["kefir", "buttermilk"], "dairy", "fridge", 7, "l", 1],
  // Meat
  ["chicken", ["chicken", "chicken breast", "chicken thigh", "chicken fillet"], "meat", "fridge", 2, "g", 500],
  ["ground beef", ["ground beef", "minced beef", "beef mince", "mince"], "meat", "fridge", 2, "g", 500],
  ["beef", ["beef", "steak", "sirloin"], "meat", "fridge", 3, "g", 400],
  ["pork", ["pork", "pork chop", "pork loin"], "meat", "fridge", 3, "g", 400],
  ["bacon", ["bacon", "pancetta"], "meat", "fridge", 7, "g", 200],
  ["ham", ["ham", "prosciutto"], "meat", "fridge", 5, "g", 150],
  ["sausage", ["sausage", "chorizo"], "meat", "fridge", 5, "pack", 1],
  ["turkey", ["turkey", "turkey breast"], "meat", "fridge", 2, "g", 400],
  // Fish
  ["salmon", ["salmon", "salmon fillet"], "fish", "fridge", 2, "g", 300],
  ["white fish", ["white fish", "cod", "hake", "haddock", "sea bass", "pollock"], "fish", "fridge", 2, "g", 300],
  ["shrimp", ["shrimp", "prawn"], "fish", "freezer", 90, "g", 300],
  ["tuna", ["tuna", "canned tuna"], "fish", "pantry", 365, "pcs", 2],
  // Grains & dry goods
  ["rice", ["rice", "basmati", "jasmine rice", "arborio"], "grains", "pantry", 365, "kg", 1],
  ["pasta", ["pasta", "spaghetti", "penne", "fusilli", "linguine", "tagliatelle", "rigatoni"], "grains", "pantry", 365, "g", 500],
  ["noodles", ["noodle", "ramen", "udon", "soba"], "grains", "pantry", 365, "pack", 1],
  ["oats", ["oat", "oatmeal", "rolled oat", "porridge oat"], "grains", "pantry", 180, "g", 500],
  ["flour", ["flour"], "grains", "pantry", 180, "kg", 1],
  ["quinoa", ["quinoa"], "grains", "pantry", 365, "g", 500],
  ["couscous", ["couscous", "bulgur"], "grains", "pantry", 365, "g", 500],
  ["buckwheat", ["buckwheat"], "grains", "pantry", 365, "g", 800],
  ["lentils", ["lentil", "red lentil"], "grains", "pantry", 365, "g", 500],
  ["chickpeas", ["chickpea", "garbanzo"], "grains", "pantry", 365, "pcs", 1],
  ["beans", ["kidney bean", "black bean", "cannellini", "white bean", "baked bean"], "grains", "pantry", 365, "pcs", 1],
  // Bakery
  ["bread", ["bread", "sourdough", "loaf", "baguette", "ciabatta", "rye bread"], "bakery", "pantry", 4, "pcs", 1],
  ["tortilla", ["tortilla", "wrap", "flatbread"], "bakery", "pantry", 10, "pack", 1],
  ["pita", ["pita"], "bakery", "pantry", 5, "pack", 1],
  // Drinks
  ["orange juice", ["orange juice", "juice"], "drinks", "fridge", 7, "l", 1],
  ["coffee", ["coffee"], "drinks", "pantry", 180, "g", 250],
  ["tea", ["tea"], "drinks", "pantry", 365, "pack", 1],
  // Other
  ["canned tomatoes", ["canned tomato", "chopped tomato", "tinned tomato", "passata", "crushed tomato"], "other", "pantry", 365, "pcs", 2],
  ["tomato paste", ["tomato paste", "tomato puree"], "other", "pantry", 180, "pcs", 1],
  ["coconut milk", ["coconut milk", "coconut cream"], "other", "pantry", 365, "pcs", 1],
  ["tofu", ["tofu"], "other", "fridge", 7, "g", 400],
  ["hummus", ["hummus"], "other", "fridge", 5, "g", 200],
  ["pesto", ["pesto"], "other", "fridge", 7, "g", 190],
  ["stock", ["stock", "broth", "bouillon"], "other", "pantry", 365, "l", 1],
  ["soy sauce", ["soy sauce", "tamari"], "other", "pantry", 365, "ml", 250],
  ["honey", ["honey"], "other", "pantry", 365, "g", 350],
  ["peanut butter", ["peanut butter", "nut butter"], "other", "pantry", 180, "g", 340],
];

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const CATALOG: CatalogEntry[] = ROWS.map(([key, aliases, category, storage, shelfDays, unit, quantity]) => ({
  key,
  label: titleCase(key),
  aliases,
  category,
  storage,
  shelfDays,
  unit,
  quantity,
}));

const BY_KEY = new Map(CATALOG.map((entry) => [entry.key, entry]));

export function getCatalogEntry(key: string): CatalogEntry | undefined {
  return BY_KEY.get(key);
}

/** Crude English singulariser: enough for grocery names ("tomatoes", "berries", "eggs"). */
function singular(word: string): string {
  if (word.length <= 3 || word.endsWith("ss")) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ch|sh|x)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip Latin accents ("crème")
    .normalize("NFC") // re-join Cyrillic letters such as "й" that NFD splits
    .replace(/[^a-zа-я\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/^[a-z]+$/.test(w) ? singular(w) : w));
}

/**
 * Russian names as word stems ("молок" matches молоко, молока). Multi-word
 * stems beat single words, so "томатная паста" is tomato paste, not pasta.
 */
const RU: Record<string, string[]> = {
  tomato: ["помидор", "томат", "черри"],
  spinach: ["шпинат"],
  lettuce: ["салат", "руккол", "айсберг"],
  cucumber: ["огур"],
  "bell pepper": ["перец", "болгарск перец", "сладк перец"],
  onion: ["лук", "луковиц"],
  "spring onion": ["зелен лук"],
  garlic: ["чеснок"],
  carrot: ["морков"],
  potato: ["картоф", "картошк"],
  "sweet potato": ["батат", "сладк картоф"],
  zucchini: ["кабач", "цукин"],
  broccoli: ["брокк"],
  mushroom: ["гриб", "шампиньон"],
  avocado: ["авокадо"],
  cabbage: ["капуст"],
  eggplant: ["баклажан"],
  celery: ["сельдере"],
  "green beans": ["стручк фасол", "зелен фасол"],
  parsley: ["петрушк"],
  basil: ["базилик"],
  cilantro: ["кинз"],
  dill: ["укроп"],
  ginger: ["имбир"],
  chili: ["чили", "остр перец"],
  peas: ["горош", "горох"],
  corn: ["кукуруз"],
  apple: ["яблок"],
  banana: ["банан"],
  lemon: ["лимон"],
  lime: ["лайм"],
  orange: ["апельсин", "мандарин"],
  berries: ["ягод", "клубник", "черник", "малин", "ежевик"],
  grapes: ["виноград"],
  pear: ["груш"],
  mango: ["манго"],
  milk: ["молок"],
  yogurt: ["йогурт"],
  cheese: ["сыр", "пармезан", "чеддер", "гауд"],
  mozzarella: ["моцарел"],
  feta: ["фет", "брынз", "халлуми"],
  "cream cheese": ["сливочн сыр", "творожн сыр", "рикотт", "маскарпоне"],
  "cottage cheese": ["творог"],
  cream: ["сливк", "сметан"],
  butter: ["масло", "масла", "сливочн масл"],
  egg: ["яйц", "яиц", "яйко"],
  kefir: ["кефир", "ряженк", "айран"],
  chicken: ["куриц", "курин", "курят"],
  "ground beef": ["фарш"],
  beef: ["говяд", "стейк"],
  pork: ["свинин", "свин"],
  bacon: ["бекон"],
  ham: ["ветчин", "хамон"],
  sausage: ["колбас", "сосис", "сардел"],
  turkey: ["индейк", "индюш"],
  salmon: ["лосос", "семг"],
  "white fish": ["рыб", "треск", "минта", "хек", "судак"],
  shrimp: ["кревет"],
  tuna: ["тунец", "тунц"],
  rice: ["рис"],
  pasta: ["макарон", "паст", "спагетт"],
  noodles: ["лапш"],
  oats: ["овсян", "геркулес"],
  flour: ["мук"],
  quinoa: ["киноа"],
  couscous: ["кускус", "булгур"],
  buckwheat: ["гречк", "гречн"],
  lentils: ["чечевиц"],
  chickpeas: ["нут"],
  beans: ["фасол"],
  bread: ["хлеб", "батон", "багет"],
  tortilla: ["лаваш", "тортиль"],
  pita: ["пита", "питы"],
  "orange juice": ["сок"],
  coffee: ["кофе"],
  tea: ["чай", "чая"],
  "canned tomatoes": ["консерв томат", "консерв помидор"],
  "tomato paste": ["томатн паст"],
  "coconut milk": ["кокос молок", "кокос сливк"],
  tofu: ["тофу"],
  hummus: ["хумус"],
  pesto: ["песто"],
  stock: ["бульон"],
  "soy sauce": ["соев соус"],
  honey: ["мед"],
  "peanut butter": ["арахис паст", "арахис масл"],
};

const ALIAS_INDEX = CATALOG.flatMap((entry) =>
  entry.aliases.map((alias) => ({ tokens: tokenize(alias), entry })),
);
const RU_INDEX = Object.entries(RU).flatMap(([key, stems]) =>
  stems.map((stem) => ({ stems: stem.split(" "), entry: BY_KEY.get(key)! })),
);

/** Best Russian stem match: most words, then longest stems, then the later word. */
function matchRussian(tokens: string[]): CatalogEntry | undefined {
  let best: { entry: CatalogEntry; words: number; length: number; end: number } | undefined;
  for (const { stems, entry } of RU_INDEX) {
    const length = stems.join("").length;
    for (let i = tokens.length - stems.length; i >= 0; i--) {
      if (!stems.every((stem, j) => tokens[i + j].startsWith(stem))) continue;
      const end = i + stems.length;
      if (!best || stems.length > best.words || (stems.length === best.words && (length > best.length || (length === best.length && end > best.end)))) {
        best = { entry, words: stems.length, length, end };
      }
      break;
    }
  }
  return best?.entry;
}

/** Index just past the last occurrence of `needle` in `haystack`, or -1. */
function lastMatchEnd(haystack: string[], needle: string[]): number {
  outer: for (let i = haystack.length - needle.length; i >= 0; i--) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i + needle.length;
  }
  return -1;
}

/**
 * Map a free-text product name ("Cherry tomatoes 250g") to a catalog entry.
 * Longer aliases win ("sweet potato" over "potato"); on equal length the
 * later word wins, because grocery names end in the head noun
 * ("chicken stock" is stock, "apple juice" is juice).
 */
export function matchCatalog(name: string): CatalogEntry | undefined {
  const tokens = tokenize(name);
  let best: { entry: CatalogEntry; length: number; end: number } | undefined;
  for (const { tokens: alias, entry } of ALIAS_INDEX) {
    const end = lastMatchEnd(tokens, alias);
    if (end < 0) continue;
    if (!best || alias.length > best.length || (alias.length === best.length && end > best.end)) {
      best = { entry, length: alias.length, end };
    }
  }
  return best?.entry ?? matchRussian(tokens);
}

/** Autocomplete suggestions for the quick-add field. */
export function searchCatalog(query: string, limit = 6): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts: CatalogEntry[] = [];
  const contains: CatalogEntry[] = [];
  for (const entry of CATALOG) {
    const names = [entry.key, ...entry.aliases];
    if (names.some((n) => n.startsWith(q))) starts.push(entry);
    else if (names.some((n) => n.includes(q))) contains.push(entry);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Typical shelf life, adjusted when the item goes into the freezer. */
export function suggestedShelfDays(entry: CatalogEntry, storage: Storage): number {
  if (storage === "freezer" && entry.storage !== "freezer") return 90;
  return entry.shelfDays;
}
