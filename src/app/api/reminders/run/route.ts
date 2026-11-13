import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { planWeek, reminderText, type PlanItem } from "@/lib/domain/plan";
import { makeT } from "@/lib/i18n/core";
import { pushConfigured, sendPush, type PushTarget } from "@/lib/push";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

type Due = { user_id: string; lang?: string; local_date: string; subscriptions: PushTarget[]; products: PlanItem[] };

/**
 * Called every hour by the database (pg_cron + pg_net). Finds people whose
 * reminder hour has come in their own time zone, plans their week with the
 * same planner as the app, sends the digest and records it.
 * Authorised only by the shared cron secret; uses the public key, no service role.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") ?? "";
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!pushConfigured()) return NextResponse.json({ error: "push not configured" }, { status: 503 });

  const { url, key } = supabaseEnv();
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("reminder_batch", { p_secret: secret });
  if (error) {
    console.error("[savora] reminder batch failed", error.code, error.message);
    return NextResponse.json({ error: "batch failed" }, { status: 500 });
  }

  const due = (data ?? []) as unknown as Due[];
  let sent = 0;
  for (const person of due) {
    const text = reminderText(planWeek(person.products, person.local_date), makeT(person.lang === "ru" ? "ru" : "en"));
    const results = await sendPush(person.subscriptions, text);
    for (const r of results) if (r.gone) await db.rpc("reminder_prune", { p_secret: secret, p_endpoint: r.endpoint });
    const delivered = results.filter((r) => r.ok).length;
    sent += delivered;
    await db.rpc("reminder_record", {
      p_secret: secret,
      p_user: person.user_id,
      p_local_date: person.local_date,
      p_devices: person.subscriptions.length,
      p_delivered: delivered,
      p_title: text.title,
    });
  }
  return NextResponse.json({ people: due.length, delivered: sent });
}
