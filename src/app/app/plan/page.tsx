import { CalendarCheck, Clock, Snowflake, Soup, Apple } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { AddMissingButton } from "@/components/plan/add-missing-button";
import { ReminderSettings } from "@/components/plan/reminder-settings";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { formatShortDate, formatWeekday } from "@/lib/domain/dates";
import { getLang, getT } from "@/lib/i18n/server";
import type { Lang, T } from "@/lib/i18n/core";
import { formatMoney, pluralize } from "@/lib/domain/format";
import { planWeek, type PlanDay, type RescueAction } from "@/lib/domain/plan";
import { listProducts, listReminderState } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Rescue plan") };
}

const dayName = (day: PlanDay, t: T, lang: Lang) => {
  const name = day.offset === 0 ? t("Today") : day.offset === 1 ? t("Tomorrow") : formatWeekday(day.date, lang);
  return name.charAt(0).toUpperCase() + name.slice(1);
};
const daysLeftLabel = (n: number, t: T) => t(n === 0 ? "date today" : n === 1 ? "1 day left" : `${n} days left`);

const ACTION_ICON: Record<RescueAction, typeof Snowflake> = { freeze: Snowflake, eat: Apple, cook: Soup };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ meals?: string }> }) {
  const viewer = await requireViewer();
  const [t, lang] = [await getT(), await getLang()];
  const meals = Math.min(3, Math.max(1, Number((await searchParams).meals) || 2));
  const [products, reminders] = await Promise.all([listProducts(viewer), listReminderState(viewer)]);
  const plan = planWeek(products, viewer.today, { mealsPerDay: meals });
  const lost = plan.atRisk.length - plan.saved.length;

  // Collapse runs of days with nothing planned into one line.
  const blocks: ({ kind: "day"; day: PlanDay } | { kind: "free"; from: PlanDay; to: PlanDay })[] = [];
  for (const day of plan.days) {
    const prev = blocks[blocks.length - 1];
    if (day.meals.length) blocks.push({ kind: "day", day });
    else if (prev?.kind === "free") prev.to = day;
    else blocks.push({ kind: "free", from: day, to: day });
  }

  return (
    <>
      <PageHeader
        eyebrow={t("Rescue plan · next 7 days")}
        title="Cook everything before its date"
        description="Savora schedules your meals so food is used in the order it runs out: the item with the least time left is planned first. Recalculated every time your kitchen changes."
        actions={
          <div className="flex items-center gap-1 rounded-full border border-line bg-card p-1 text-sm" role="group" aria-label={t("Meals per day")}>
            {[1, 2, 3].map((n) => (
              <Link
                key={n}
                href={`/app/plan?meals=${n}`}
                aria-current={n === meals ? "true" : undefined}
                className={cx("rounded-full px-3 py-1.5", n === meals ? "bg-forest text-card" : "text-ink-2 hover:bg-paper-deep")}
              >
                {t(`${n} ${n === 1 ? "meal" : "meals"}/day`)}
              </Link>
            ))}
          </div>
        }
      />

      {plan.atRisk.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="size-6" />}
          title="Nothing reaches its date this week"
          action={<LinkButton href="/app/meals" variant="secondary">{t("Browse meal ideas")}</LinkButton>}
        >
          Every item has more than seven days left. Savora will plan again as dates come closer.
        </EmptyState>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <section aria-label={t("Plan impact")} className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-card lg:grid-cols-4">
              <Stat label={t("Reach their date this week")} value={String(plan.atRisk.length)} note={plan.atRiskValueCents ? t("{money} of food", { money: formatMoney(plan.atRiskValueCents) }) : t("without a plan")} />
              <Stat label={t("Used in time with this plan")} value={String(plan.saved.length)} note={t("{p}% of them", { p: Math.round((plan.saved.length / plan.atRisk.length) * 100) })} tone="fresh" />
              <Stat label={t("Kept out of the bin")} value={plan.savedValueCents ? formatMoney(plan.savedValueCents) : "—"} note={t(plan.savedValueCents ? "from prices you entered" : "add prices to see value")} />
              <Stat label={t("Need another rescue")} value={String(lost)} note={t(lost ? "see the steps below" : "nothing left over")} tone={lost ? "soon" : undefined} />
            </section>

            <ol className="mt-8 flex flex-col gap-4">
              {blocks.map((b) =>
                b.kind === "free" ? (
                  <li key={b.from.date} className="rounded-xl border border-dashed border-line px-5 py-4 text-sm text-muted">
                    <span className="font-medium text-ink-2">
                      {b.from === b.to ? dayName(b.from, t, lang) : `${dayName(b.from, t, lang)} – ${dayName(b.to, t, lang)}`}
                    </span>{" "}
                    · {t("free: nothing reaches its date. Cook whatever you like.")}
                  </li>
                ) : (
                  <li key={b.day.date} className="rounded-xl border border-line bg-card p-5 sm:p-6">
                    <div className="mb-4 flex items-baseline justify-between gap-3">
                      <h2 className="text-xl font-medium">{dayName(b.day, t, lang)}</h2>
                      <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{formatShortDate(b.day.date, lang)}</span>
                    </div>
                    <div className="flex flex-col divide-y divide-line">
                      {b.day.meals.map((meal) => (
                        <div key={meal.recipe.slug} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <Link href={`/app/meals/${meal.recipe.slug}`} className="font-display text-[1.35rem] leading-tight hover:underline">
                              {t(meal.recipe.title)}
                            </Link>
                            <span className="inline-flex items-center gap-1 text-sm text-muted">
                              <Clock className="size-3.5" aria-hidden="true" /> {t("{n} min", { n: meal.recipe.minutes })}
                            </span>
                          </div>
                          <p className="text-sm text-ink-2">{t(meal.reason)}</p>
                          <ul className="flex flex-wrap gap-2" aria-label={t("Rescues")}>
                            {meal.rescues.map((r) => (
                              <li
                                key={r.item.id}
                                className={cx(
                                  "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
                                  r.daysLeft - b.day.offset <= 1 ? "bg-soon-soft text-soon" : "bg-forest-wash text-forest-mid",
                                )}
                              >
                                {t(r.item.name)} · {daysLeftLabel(r.daysLeft, t)}
                              </li>
                            ))}
                          </ul>
                          {meal.missing.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                              <span>{t("Missing:")} {meal.missing.map((m) => t(m.label).toLowerCase()).join(", ")}</span>
                              <AddMissingButton slug={meal.recipe.slug} count={meal.missing.length} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </li>
                ),
              )}
            </ol>

            {plan.rescueSteps.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-1 text-xl font-medium">{t("No meal fits these — rescue them another way")}</h2>
                <p className="mb-4 text-sm text-muted">{t("Freezing, eating as is or adding to a soup still keeps them out of the bin.")}</p>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                  {plan.rescueSteps.map((s) => {
                    const Icon = ACTION_ICON[s.action];
                    return (
                      <li key={s.item.id} className="flex items-start gap-3 px-5 py-4">
                        <Icon className="mt-0.5 size-5 shrink-0 text-forest-mid" aria-hidden="true" />
                        <p className="text-sm">
                          <span className="font-medium">{t(s.item.name)}</span> <span className="text-muted">· {daysLeftLabel(s.daysLeft, t)}.</span> {t(s.text)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <p className="mt-8 text-xs text-muted">
              {t("How it works: each item has a deadline (its date). For every meal slot the planner picks the recipe that rescues the items with the least time left, never plans an item after its date, never uses past-date items and does not repeat a dish within three days. It assumes one dish uses up the item it includes.")}
            </p>
          </div>

          <aside className="flex flex-col gap-6">
            <ReminderSettings
              vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
              hour={reminders.hour}
              devices={reminders.devices}
              lastSent={reminders.lastSent}
            />
            {plan.toBuy.length > 0 && (
              <div className="rounded-xl border border-line bg-card p-5">
                <p className="eyebrow mb-2">{t("To complete the plan")}</p>
                <p className="text-sm text-ink-2">
                  {t("Buy {n}:", { n: t(pluralize(plan.toBuy.length, "item")) })} {plan.toBuy.map((m) => t(m.label).toLowerCase()).join(", ")}. {t("Use “Add missing to list” on each meal.")}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "fresh" | "soon" }) {
  return (
    <div className="border-line p-4 sm:p-5 [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0 [&:not(:first-child)]:border-l [&:nth-child(3)]:border-l-0 lg:[&:nth-child(3)]:border-l">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx("mt-1 font-display text-[2rem] leading-none tabular", tone === "fresh" && "text-fresh", tone === "soon" && "text-soon")}>{value}</p>
      <p className="mt-1.5 text-xs text-muted">{note}</p>
    </div>
  );
}
