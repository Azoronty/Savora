/**
 * Savi: the kitchen companion. Stages, missions and the deterministic
 * event → reaction rules live here so they are testable without React.
 * XP values and caps mirror supabase/migrations/20261107000002_savi.sql,
 * where XP is actually awarded.
 */

export type SaviStage = { n: number; name: string; minXp: number; blurb: string };

export const SAVI_STAGES: SaviStage[] = [
  { n: 1, name: "Seed", minXp: 0, blurb: "A small spark of care." },
  { n: 2, name: "Sprout", minXp: 60, blurb: "First leaves, first habits." },
  { n: 3, name: "Bud", minXp: 160, blurb: "Growing stronger every day." },
  { n: 4, name: "Harvest", minXp: 320, blurb: "A true kitchen helper." },
  { n: 5, name: "Guardian", minXp: 560, blurb: "Protecting your food." },
  { n: 6, name: "Chef", minXp: 900, blurb: "Cooking up better choices." },
  { n: 7, name: "Food Guardian", minXp: 1400, blurb: "A champion against food waste." },
];

export type SaviProgress = {
  xp: number;
  stage: SaviStage;
  next: SaviStage | null;
  /** 0–1 progress from the current stage towards the next. */
  fraction: number;
  xpToNext: number;
};

export function saviProgress(xp: number): SaviProgress {
  const safe = Math.max(0, Math.floor(xp));
  let i = 0;
  while (i + 1 < SAVI_STAGES.length && safe >= SAVI_STAGES[i + 1].minXp) i++;
  const stage = SAVI_STAGES[i];
  const next = SAVI_STAGES[i + 1] ?? null;
  if (!next) return { xp: safe, stage, next, fraction: 1, xpToNext: 0 };
  return {
    xp: safe,
    stage,
    next,
    fraction: (safe - stage.minXp) / (next.minXp - stage.minXp),
    xpToNext: next.minXp - safe,
  };
}

export type MissionKey = "rescue" | "cook" | "stock";

export const SAVI_MISSIONS: { key: MissionKey; title: string; detail: string; xp: number; href: string; cta: string }[] = [
  {
    key: "rescue",
    title: "Rescue one item",
    detail: "Use something within 3 days of its date and mark it as used.",
    xp: 30,
    href: "/app/expiring",
    cta: "See what needs using",
  },
  {
    key: "cook",
    title: "Cook from your kitchen",
    detail: "Make a suggested recipe and press “I cooked this”.",
    xp: 30,
    href: "/app/meals",
    cta: "Find a recipe",
  },
  {
    key: "stock",
    title: "Keep the list honest",
    detail: "Add 3 products, or put a shopping trip away.",
    xp: 20,
    href: "/app/shopping",
    cta: "Open shopping list",
  },
];

export const SAVI_XP_RULES: { action: string; xp: number; cap: string }[] = [
  { action: "Use an item within 3 days of its date (a rescue)", xp: 15, cap: "10 a day" },
  { action: "Cook a recipe with “I cooked this”", xp: 20, cap: "3 a day" },
  { action: "Put a shopping trip away", xp: 10, cap: "3 a day" },
  { action: "Use an item earlier than that", xp: 3, cap: "10 a day" },
  { action: "Add a product", xp: 2, cap: "10 a day" },
];

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

export type SaviEvent =
  | { type: "welcome" }
  | { type: "product_added"; name: string }
  | { type: "product_used"; name: string; rescued: boolean }
  | { type: "product_discarded" }
  | { type: "recipe_cooked"; title?: string }
  | { type: "shopping_added"; name: string }
  | { type: "shopping_stocked"; count: number }
  | { type: "mission_completed"; mission: MissionKey; xp: number }
  | { type: "level_up"; stage: SaviStage }
  | { type: "expiring"; names: string[]; count: number }
  | { type: "recipe_match"; title: string; slug: string }
  | { type: "empty_inventory" }
  | { type: "idle" }
  | { type: "pet"; tip: number };

export type SaviMood = "happy" | "curious" | "surprised" | "proud" | "sleepy" | "calm";
export type SaviAnimation = "talk" | "hop" | "inspect" | "celebrate" | "sleep" | "levelUp" | "wiggle";

export type SaviReaction = {
  key: string;
  text: string;
  mood: SaviMood;
  animation: SaviAnimation;
  action?: { label: string; href?: string; command?: "add-product" };
  /** Higher priority may interrupt; ambient lines yield to everything. */
  priority: "ambient" | "event" | "milestone";
  /** Ambient lines repeat at most once per this many ms (stored per key). */
  cooldownMs?: number;
};

const DAY = 86_400_000;

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TIPS = [
  "Add products as you unpack: it takes a few seconds each.",
  "Ticked items wait in the basket until you put them away.",
  "Recipes list what you have and what's missing.",
  "The week ahead shows what reaches its date, and when.",
  "Every XP I earn comes from something you actually did.",
];

/**
 * First-visit tour. Steps with href: Savi walks to that nav link, the page opens and
 * `spot` (a CSS selector on that page) is highlighted. Steps without href happen on Today.
 * `anywhere`: show the step even when the layout has no nav link for it (Savi stays home).
 */
export const SAVI_TOUR: { href?: string; spot?: string; text: string; anywhere?: boolean }[] = [
  { text: "Hi, I'm Savi! Want a quick tour of your kitchen?" },
  { href: "/app/inventory", spot: "main ul:has(> [data-savi-product])", text: "This is your inventory: fridge, freezer and pantry in one list. Type a name and I fill in the rest." },
  { href: "/app/expiring", spot: "main ul:has(> [data-savi-product])", text: "Use soon shows food to eat in the next 3 days, with recipes that use it. Check here first." },
  { href: "/app/plan", spot: "main section[aria-label='Plan impact']", anywhere: true, text: "The rescue plan schedules your meals so everything is cooked before its date. Turn on the morning reminder here." },
  { href: "/app/meals", spot: "main a[href^='/app/meals/']", text: "Meals are ranked by what expires first. \"I cooked this\" updates your stock." },
  { href: "/app/shopping", spot: "main form:has(#shopping-name)", text: "Add to the shopping list here. It blocks duplicates and warns when something is already at home." },
  { href: "/app/waste", spot: "main section[aria-label='Summary']", text: "If food gets thrown away, log it. These numbers show what you lose and why." },
  { text: "That's the tour! Tap me any time for a food-saving tip." },
];

/** Map an app event to what Savi says and does. Pure and deterministic. */
export function reactTo(event: SaviEvent): SaviReaction {
  switch (event.type) {
    case "welcome":
      return {
        key: "welcome",
        text: "Hi! I'm Savi. Let's get your kitchen organized.",
        mood: "happy",
        animation: "hop",
        action: { label: "Add a product", command: "add-product" },
        priority: "event",
        cooldownMs: 365 * DAY,
      };
    case "product_added":
      return { key: "product_added", text: `${title(event.name)}! I'll keep an eye on it.`, mood: "curious", animation: "inspect", priority: "event" };
    case "product_used":
      return event.rescued
        ? { key: "rescued", text: "Nice save! That food didn't go to waste.", mood: "proud", animation: "celebrate", priority: "event" }
        : { key: "used", text: `${title(event.name)}, enjoyed. Good call.`, mood: "happy", animation: "wiggle", priority: "event" };
    case "product_discarded":
      return { key: "discarded", text: "Noted. The waste log helps spot patterns over time.", mood: "calm", animation: "talk", priority: "event" };
    case "recipe_cooked":
      return { key: "cooked", text: "Cooked from what you had. That's the whole idea!", mood: "proud", animation: "celebrate", priority: "event" };
    case "shopping_added":
      return { key: "shopping_added", text: `${title(event.name)} is on the list.`, mood: "happy", animation: "talk", priority: "event" };
    case "shopping_stocked":
      return { key: "stocked", text: `${event.count} ${event.count === 1 ? "item" : "items"} put away. I'll watch the dates.`, mood: "happy", animation: "hop", priority: "event" };
    case "mission_completed":
      return {
        key: `mission_${event.mission}`,
        text: `Mission complete. That's +${event.xp} XP!`,
        mood: "proud",
        animation: "celebrate",
        action: { label: "See progress", href: "/app/savi" },
        priority: "milestone",
      };
    case "level_up":
      return {
        key: `level_${event.stage.n}`,
        text: `Look at me! I've grown into ${event.stage.name}.`,
        mood: "proud",
        animation: "levelUp",
        action: { label: "Meet the new me", href: "/app/savi" },
        priority: "milestone",
      };
    case "expiring": {
      const lead = event.names[0] ? title(event.names[0]) : "Some items";
      const text =
        event.count === 1 ? `${lead} should be used soon.` : `${lead} and ${event.count - 1} more should be used soon.`;
      return {
        key: "expiring",
        text,
        mood: "curious",
        animation: "talk",
        action: { label: "Show them", href: "/app/expiring" },
        priority: "ambient",
        cooldownMs: 8 * 3_600_000,
      };
    }
    case "recipe_match":
      return {
        key: `recipe_${event.slug}`,
        text: `You already have what you need for ${event.title.toLowerCase()}.`,
        mood: "happy",
        animation: "talk",
        action: { label: "See recipe", href: `/app/meals/${event.slug}` },
        priority: "ambient",
        cooldownMs: DAY,
      };
    case "empty_inventory":
      return {
        key: "empty",
        text: "Let's add a few things to your kitchen.",
        mood: "curious",
        animation: "hop",
        action: { label: "Add a product", command: "add-product" },
        priority: "ambient",
        cooldownMs: 3_600_000,
      };
    case "idle":
      return { key: "idle", text: "I'll be right here when you need me.", mood: "sleepy", animation: "sleep", priority: "ambient", cooldownMs: 3_600_000 };
    case "pet":
      return { key: "pet", text: TIPS[event.tip % TIPS.length], mood: "happy", animation: "wiggle", priority: "event" };
  }
}

const RANK = { ambient: 0, event: 1, milestone: 2 } as const;

export type SpeechState = {
  /** When the current bubble started, or null if none is showing. */
  showingSince: number | null;
  showingPriority: SaviReaction["priority"] | null;
  lastAmbientAt: number;
  lastByKey: Record<string, number>;
};

/** Minimum gap between unsolicited (ambient) bubbles. */
export const AMBIENT_GAP_MS = 45_000;

/**
 * Rate limiting: one bubble at a time; a new bubble may replace the current
 * one only with equal or higher priority; ambient lines respect a global gap
 * and their own per-key cooldown.
 */
export function shouldSpeak(reaction: SaviReaction, state: SpeechState, now: number): boolean {
  if (state.showingSince !== null && state.showingPriority && RANK[reaction.priority] < RANK[state.showingPriority]) {
    return false;
  }
  const last = state.lastByKey[reaction.key];
  if (reaction.cooldownMs && last !== undefined && now - last < reaction.cooldownMs) return false;
  if (reaction.priority === "ambient") {
    if (state.showingSince !== null) return false;
    if (now - state.lastAmbientAt < AMBIENT_GAP_MS) return false;
  }
  return true;
}
