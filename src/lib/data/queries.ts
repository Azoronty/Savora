import "server-only";
import { cache } from "react";
import { addDays } from "@/lib/domain/dates";
import { USE_SOON_DAYS, type Category, type Storage } from "@/lib/domain/constants";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { nameAliases } from "@/lib/i18n/core";
import type { Viewer } from "./session";

const PRODUCT_COLUMNS =
  "id, name, item_key, quantity, unit, category, storage, purchased_on, expires_on, price_cents, notes, is_demo" as const;
export type Product = Pick<Tables<"products">, "id" | "name" | "item_key" | "quantity" | "unit" | "category" | "storage" | "purchased_on" | "expires_on" | "price_cents" | "notes" | "is_demo">;

const SHOPPING_COLUMNS =
  "id, name, quantity, unit, category, note, source, source_recipe, purchased_at, is_demo, created_at" as const;
export type ShoppingItem = Pick<Tables<"shopping_items">, "id" | "name" | "quantity" | "unit" | "category" | "note" | "source" | "source_recipe" | "purchased_at" | "is_demo" | "created_at">;

const WASTE_COLUMNS =
  "id, product_name, category, quantity, unit, reason, discarded_on, cost_cents, is_demo" as const;
export type WasteRecord = Pick<Tables<"waste_records">, "id" | "product_name" | "category" | "quantity" | "unit" | "reason" | "discarded_on" | "cost_cents" | "is_demo">;

export type StatusFilter = "all" | "fresh" | "soon" | "expired";
export type SortKey = "expiry" | "name" | "category" | "recent";

export type InventoryQuery = {
  q?: string;
  category?: Category;
  storage?: Storage;
  status?: StatusFilter;
  sort?: SortKey;
};

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Could not load ${what}.`, { cause: error });
}

/** Escape LIKE wildcards so user input is matched literally. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// Cached per request: several components read the same inventory.
export const listProducts = cache(async (viewer: Viewer, query: InventoryQuery = {}): Promise<Product[]> => {
  const supabase = await createClient();
  let request = supabase.from("products").select(PRODUCT_COLUMNS).eq("household_id", viewer.householdId);

  if (query.q) {
    // Also match the name in the other language; the OR filter is built only from safe characters.
    const terms = /^[\p{L}\d -]+$/u.test(query.q) ? [query.q, ...nameAliases(query.q)] : [];
    request = terms.length > 1 ? request.or(terms.map((t) => `name.ilike.%${t}%`).join(",")) : request.ilike("name", likePattern(query.q));
  }
  if (query.category) request = request.eq("category", query.category);
  if (query.storage) request = request.eq("storage", query.storage);

  const soonLimit = addDays(viewer.today, USE_SOON_DAYS);
  if (query.status === "expired") request = request.lt("expires_on", viewer.today);
  if (query.status === "soon") request = request.gte("expires_on", viewer.today).lte("expires_on", soonLimit);
  if (query.status === "fresh") request = request.gt("expires_on", soonLimit);

  switch (query.sort ?? "expiry") {
    case "name":
      request = request.order("name", { ascending: true });
      break;
    case "category":
      request = request.order("category", { ascending: true }).order("expires_on", { ascending: true });
      break;
    case "recent":
      request = request.order("created_at", { ascending: false });
      break;
    default:
      request = request.order("expires_on", { ascending: true }).order("name", { ascending: true });
  }

  const { data, error } = await request.limit(500);
  if (error) fail("your inventory", error);
  return data;
});

/** Items at or past their date within the use-soon window, most urgent first. */
export async function listAttentionProducts(viewer: Viewer): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("household_id", viewer.householdId)
    .lte("expires_on", addDays(viewer.today, USE_SOON_DAYS))
    .order("expires_on", { ascending: true })
    .order("name", { ascending: true });
  if (error) fail("expiring products", error);
  return data;
}

export async function getProduct(viewer: Viewer, id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("household_id", viewer.householdId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("this product", error);
  return data;
}

export async function listShoppingItems(viewer: Viewer): Promise<ShoppingItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .select(SHOPPING_COLUMNS)
    .eq("household_id", viewer.householdId)
    .order("purchased_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });
  if (error) fail("your shopping list", error);
  return data;
}

export async function listWasteRecords(viewer: Viewer, sinceDays = 180): Promise<WasteRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waste_records")
    .select(WASTE_COLUMNS)
    .eq("household_id", viewer.householdId)
    .gte("discarded_on", addDays(viewer.today, -sinceDays))
    .order("discarded_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) fail("your waste log", error);
  return data;
}

export async function hasDemoData(viewer: Viewer): Promise<boolean> {
  const supabase = await createClient();
  const checks = await Promise.all(
    (["products", "shopping_items", "waste_records"] as const).map((table) =>
      supabase.from(table).select("id", { count: "exact", head: true }).eq("household_id", viewer.householdId).eq("is_demo", true),
    ),
  );
  return checks.some((c) => (c.count ?? 0) > 0);
}

export type SaviState = {
  xp: number;
  missionsDone: string[];
  /** Today's counts by event kind, for mission progress. */
  today: Record<string, number>;
  recent: { id: number; kind: string; xp: number; label: string | null; created_at: string }[];
};

export const getSaviState = cache(async (viewer: Viewer, recentLimit = 0): Promise<SaviState> => {
  const supabase = await createClient();
  const [xp, missions, todayEvents, recent] = await Promise.all([
    supabase.rpc("savi_total_xp"),
    supabase.from("savi_missions").select("mission").eq("household_id", viewer.householdId).eq("local_day", viewer.today),
    supabase.from("savi_events").select("kind").eq("household_id", viewer.householdId).eq("local_day", viewer.today),
    recentLimit
      ? supabase
          .from("savi_events")
          .select("id, kind, xp, label, created_at")
          .eq("household_id", viewer.householdId)
          .order("created_at", { ascending: false })
          .limit(recentLimit)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const error = xp.error ?? missions.error ?? todayEvents.error ?? recent.error;
  if (error) fail("Savi's progress", error);
  const today: Record<string, number> = {};
  for (const e of todayEvents.data ?? []) today[e.kind] = (today[e.kind] ?? 0) + 1;
  return {
    xp: Number(xp.data ?? 0),
    missionsDone: (missions.data ?? []).map((m) => m.mission),
    today,
    recent: recent.data ?? [],
  };
});

/** Lightweight inventory snapshot shared by navigation badges and Savi's context. */
export async function listInventorySnapshot(viewer: Viewer) {
  const supabase = await createClient();
  const [products, shopping] = await Promise.all([
    supabase.from("products").select("id, name, expires_on").eq("household_id", viewer.householdId).order("expires_on").limit(500),
    supabase
      .from("shopping_items")
      .select("id", { count: "exact", head: true })
      .eq("household_id", viewer.householdId)
      .is("purchased_at", null),
  ]);
  if (products.error) fail("your inventory", products.error);
  return { products: products.data, openShopping: shopping.count ?? 0 };
}

export type HistoryRow = Pick<Tables<"inventory_events">, "item_key" | "item_name" | "kind" | "quantity" | "unit" | "price_cents" | "occurred_on" | "days_held" | "is_demo">;

/** Bought / used / wasted history for Predictive Kitchen (most recent 120 days). */
export const listHistory = cache(async (viewer: Viewer, sinceDays = 120): Promise<HistoryRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_events")
    .select("item_key, item_name, kind, quantity, unit, price_cents, occurred_on, days_held, is_demo")
    .eq("household_id", viewer.householdId)
    .gte("occurred_on", addDays(viewer.today, -sinceDays))
    .order("occurred_on", { ascending: true })
    .limit(5000);
  if (error) fail("your purchase history", error);
  return data;
});

export type ReminderState = {
  hour: number;
  devices: number;
  lastSent: { kind: "daily" | "test"; sentAt: string; delivered: number; devices: number; title: string } | null;
};

/** Reminder settings and the latest reminder actually sent, as proof it works. */
export async function listReminderState(viewer: Viewer): Promise<ReminderState> {
  const supabase = await createClient();
  const [profile, devices, last] = await Promise.all([
    supabase.from("profiles").select("reminder_hour").eq("id", viewer.userId).single(),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    supabase.from("reminder_log").select("kind, sent_at, delivered, devices, title").order("sent_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  // Before the reminders migration exists these fail; the page still renders without reminders.
  const row = last.data;
  return {
    hour: profile.data?.reminder_hour ?? 9,
    devices: devices.count ?? 0,
    lastSent: row ? { kind: row.kind as "daily" | "test", sentAt: row.sent_at, delivered: row.delivered, devices: row.devices, title: row.title } : null,
  };
}
