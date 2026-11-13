import { ArrowRight, CircleAlert, Hourglass, Lightbulb, Package, Recycle, Snowflake, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { WeekAhead } from "@/components/dashboard/week-ahead";
import { QuickAddButton, LoadSampleButton } from "@/components/dashboard/dashboard-actions";
import { RecipeCard } from "@/components/meals/recipe-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { STORAGES, STORAGE_LABEL } from "@/lib/domain/constants";
import { formatLongDate } from "@/lib/domain/dates";
import { getExpiry, type ExpiryStatus } from "@/lib/domain/expiry";
import { formatMoney, pluralize } from "@/lib/domain/format";
import { buildInsights, type Insight } from "@/lib/domain/insights";
import { planWeek } from "@/lib/domain/plan";
import { recommendRecipes } from "@/lib/domain/recommend";
import { computeWasteStats } from "@/lib/domain/waste";
import { getSaviState, listProducts, listShoppingItems, listWasteRecords } from "@/lib/data/queries";
import { getPrediction } from "@/lib/data/predict";
import type { KitchenPrediction } from "@/lib/data/predict";
import { SAVI_MISSIONS, saviProgress } from "@/lib/domain/savi";
import { requireViewer } from "@/lib/data/session";
import { getLang, getT } from "@/lib/i18n/server";
import type { Lang, T } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Today") };
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  if (!viewer.onboarded) redirect("/app/welcome");

  const [products, shopping, waste, savi] = await Promise.all([
    listProducts(viewer),
    listShoppingItems(viewer),
    listWasteRecords(viewer, 70),
    getSaviState(viewer),
  ]);
  const prediction = await getPrediction(viewer); // reuses the cached inventory read
  const { today } = viewer;
  const [t, lang] = [await getT(), await getLang()];

  if (products.length === 0 && waste.length === 0) {
    return (
      <>
        <Greeting today={today} lang={lang} title={t("Let's stock your kitchen.")} />
        <EmptyState
          icon={<Package className="size-6" />}
          title="Your inventory is empty"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <QuickAddButton label={t("Add your first product")} />
              <LoadSampleButton />
            </div>
          }
        >
          {t("Add what’s in your fridge, freezer and pantry. Savora keeps an eye on the dates and suggests what to cook first.")}
        </EmptyState>
      </>
    );
  }

  const statuses = products.map((p) => getExpiry(p.expires_on, today).status);
  const count = (s: ExpiryStatus) => statuses.filter((x) => x === s).length;
  const soon = count("soon");
  const expired = count("expired");
  const openShopping = shopping.filter((s) => !s.purchased_at);
  const wasteStats = computeWasteStats(waste, today);
  const suggestions = recommendRecipes(products, today, { limit: 3 });
  const insights = buildInsights({ products, shopping: openShopping, waste, today });
  const plan = planWeek(products, today);

  const headline = t(
    soon + expired === 0
      ? "Everything is comfortably in date."
      : soon > 0
        ? `${soon} ${soon === 1 ? "item needs" : "items need"} using soon.`
        : `${expired} ${expired === 1 ? "item is" : "items are"} past date.`,
  );

  return (
    <>
      <Greeting today={today} lang={lang} title={headline} action={<QuickAddButton label={t("Add product")} hideOnMobile />} />

      {/* Key figures */}
      <section aria-label={t("Overview")} className="mb-10 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-card lg:grid-cols-4">
        <Stat href="/app/inventory" label={t("In stock")} value={products.length} note={STORAGES.map((s) => `${t(STORAGE_LABEL[s].replace("Refrigerator", "Fridge"))} ${products.filter((p) => p.storage === s).length}`).join(" · ")} />
        <Stat href="/app/expiring" label={t("Use soon")} value={soon} note={t("Within 3 days")} tone={soon ? "soon" : undefined} icon={<Hourglass className="size-4" />} />
        <Stat href="/app/inventory?status=expired" label={t("Past date")} value={expired} note={t(expired ? "Check before using" : "Nothing overdue")} tone={expired ? "expired" : undefined} icon={<CircleAlert className="size-4" />} />
        <Stat
          href="/app/waste"
          label={t("Waste this month")}
          value={wasteStats.thisMonth.count}
          note={wasteStats.thisMonth.costCents > 0 ? t("{money} logged value", { money: formatMoney(wasteStats.thisMonth.costCents, lang) }) : t("Items logged")}
          icon={<Recycle className="size-4" />}
        />
      </section>

      {plan.atRisk.length > 0 && (
        <Link
          href="/app/plan"
          className="group mb-12 flex flex-col gap-4 rounded-xl bg-forest p-5 text-card shadow-soft transition-colors hover:bg-forest-deep sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="min-w-0">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-card/60">{t("Rescue plan · next 7 days")}</p>
            <p className="mt-1.5 font-display text-[1.45rem] leading-snug">
              {t(`${plan.atRisk.length} ${plan.atRisk.length === 1 ? "item reaches its date" : "items reach their date"} this week. The plan uses ${plan.saved.length} of them in time.`)}
            </p>
            {plan.days[0].meals.length > 0 && (
              <p className="mt-1 text-sm text-card/75">{t("Today")}: {plan.days[0].meals.map((m) => t(m.recipe.title)).join(" + ")}</p>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium">
            {t("Open the plan")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      )}

      <section className="mb-12" aria-labelledby="week-heading">
        <SectionHeading id="week-heading" eyebrow={t("Expiry timeline")} title={t("The week ahead")} href="/app/expiring" cta={t("Use-soon list")} />
        <WeekAhead products={products} today={today} />
      </section>

      <section className="mb-12" aria-labelledby="cook-heading">
        <SectionHeading id="cook-heading" eyebrow={t("From what you have")} title={t("Cook next")} href="/app/meals" cta={t("All suggestions")} />
        {suggestions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((match, i) => (
              <RecipeCard key={match.recipe.slug} match={match} featured={i === 0 && match.urgent.length > 0} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-muted">
            {t("Add a few more ingredients and Savora will suggest meals built around them.")}
          </p>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
          <section aria-labelledby="insights-heading">
            <SectionHeading id="insights-heading" eyebrow={t("Food-saving notes")} title={t("Worth knowing")} />
            {insights.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-card">
                {insights.map((insight) => (
                  <InsightItem key={insight.id} insight={insight} t={t} />
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-line bg-card p-5 text-sm text-muted">
                {t("Nothing needs your attention right now. Notes appear here when something is worth acting on.")}
              </p>
            )}
          </section>

          <div className="flex flex-col gap-10">
          <SaviCard xp={savi.xp} missionsDone={savi.missionsDone.length} t={t} />
          <PredictCard prediction={prediction} t={t} />
          <section aria-labelledby="storage-heading">
            <SectionHeading id="storage-heading" eyebrow={t("Inventory")} title={t("Where things are")} />
            <ul className="flex flex-col gap-4 rounded-xl border border-line bg-card p-5">
              {STORAGES.map((storage) => {
                const items = products.filter((p) => p.storage === storage);
                const parts = (["expired", "soon", "fresh"] as const).map((s) => ({
                  s,
                  n: items.filter((p) => getExpiry(p.expires_on, today).status === s).length,
                }));
                return (
                  <li key={storage}>
                    <Link href={`/app/inventory?storage=${storage}`} className="group block rounded-md">
                      <div className="mb-2 flex items-baseline justify-between text-sm">
                        <span className="font-medium group-hover:text-forest-mid">{t(STORAGE_LABEL[storage])}</span>
                        <span className="tabular text-muted">{t(pluralize(items.length, "item"))}</span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                        {parts.map(({ s, n }) =>
                          n ? (
                            <span
                              key={s}
                              style={{ width: `${(n / Math.max(items.length, 1)) * 100}%` }}
                              className={s === "expired" ? "bg-expired" : s === "soon" ? "bg-saffron" : "bg-fresh"}
                            />
                          ) : null,
                        )}
                      </div>
                      <p className="sr-only">
                        {parts.map(({ s, n }) => `${n} ${t(s)}`).join(", ")}
                      </p>
                    </Link>
                  </li>
                );
              })}
              <li className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                <Legend className="bg-fresh" label={t("Fresh")} />
                <Legend className="bg-saffron" label={t("Use soon")} />
                <Legend className="bg-expired" label={t("Past date")} />
              </li>
            </ul>
          </section>
          </div>
      </div>
    </>
  );
}

function Greeting({ today, lang, title, action }: { today: string; lang: Lang; title: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
      <div>
        <p className="eyebrow mb-3">{formatLongDate(today, lang)}</p>
        <h1 className="max-w-2xl text-[2.25rem] font-normal leading-[1.05] sm:text-[3rem]">{title}</h1>
      </div>
      {action}
    </header>
  );
}

function Stat({
  href,
  label,
  value,
  note,
  tone,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  note: string;
  tone?: "soon" | "expired";
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border-line p-5 transition-colors hover:bg-white/70 sm:p-6 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0"
    >
      <span className="flex items-center justify-between text-sm text-ink-2">
        {label}
        <span className={tone === "soon" ? "text-soon" : tone === "expired" ? "text-expired" : "text-faint"}>{icon}</span>
      </span>
      <span
        className={`mt-3 font-display text-[2.6rem] leading-none tabular ${tone === "soon" ? "text-soon" : tone === "expired" ? "text-expired" : "text-ink"}`}
      >
        {value}
      </span>
      <span className="mt-2 truncate text-[0.8125rem] text-muted">{note}</span>
    </Link>
  );
}

function SectionHeading({ id, eyebrow, title, href, cta }: { id: string; eyebrow: string; title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-1.5">{eyebrow}</p>
        <h2 id={id} className="text-[1.6rem] font-normal leading-tight">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-forest-mid hover:text-forest">
          {cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

const INSIGHT_ICON = {
  freeze: Snowflake,
  duplicate: ShoppingBasket,
  "past-date": CircleAlert,
  "waste-pattern": Recycle,
} as const;

function InsightItem({ insight, t }: { insight: Insight; t: T }) {
  const Icon = INSIGHT_ICON[insight.kind] ?? Lightbulb;
  return (
    <li className="flex gap-3.5 p-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest-wash text-forest-mid">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-medium leading-snug">{t(insight.title)}</p>
        <p className="mt-1 text-sm text-muted">{t(insight.body)}</p>
        {insight.href && (
          <LinkButton href={insight.href} variant="quiet" size="sm" className="mt-1 h-8 px-0">
            {insight.cta && t(insight.cta)} <ArrowRight className="size-3.5" aria-hidden="true" />
          </LinkButton>
        )}
      </div>
    </li>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function SaviCard({ xp, missionsDone, t }: { xp: number; missionsDone: number; t: T }) {
  const p = saviProgress(xp);
  return (
    <Link
      href="/app/savi"
      className="group flex items-center gap-5 rounded-xl border border-line bg-[radial-gradient(ellipse_at_15%_90%,var(--color-saffron-soft),transparent_55%),var(--color-card)] p-5 transition-shadow hover:shadow-lift"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- small sprite */}
      <img src={`/savi/stage-${p.stage.n}.webp`} alt="" className="h-20 w-auto shrink-0 drop-shadow-[0_8px_12px_rgba(20,42,30,0.18)] transition-transform duration-300 group-hover:-translate-y-1" />
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-1">{t("Savi · stage {n}", { n: p.stage.n })}</p>
        <p className="font-display text-xl leading-tight">{t(p.stage.name)}</p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-paper-deep" aria-hidden="true">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-chart),var(--color-saffron))]" style={{ width: `${Math.max(4, p.fraction * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {t("{xp} XP · {done}/{total} missions today", { xp, done: missionsDone, total: SAVI_MISSIONS.length })}
        </p>
      </div>
    </Link>
  );
}

function PredictCard({ prediction, t }: { prediction: KitchenPrediction; t: T }) {
  const risk = prediction.risks[0];
  const smart = prediction.suggestions[0];
  return (
    <Link href="/app/predict" className="group block rounded-xl border border-line bg-card p-5 transition-shadow hover:shadow-lift">
      <p className="eyebrow mb-1">{t("Predictive Kitchen")}</p>
      {prediction.totalEvents === 0 ? (
        <p className="text-sm text-muted">{t("Learning from your purchases. Patterns appear after a couple of shopping trips.")}</p>
      ) : (
        <>
          <p className="font-display text-xl leading-tight">
            {t("{a} at risk · {b} smarter amounts", { a: prediction.risks.length, b: prediction.suggestions.length }).replace("1 smarter amounts", "1 smarter amount")}
          </p>
          {risk && <p className="mt-2 text-sm text-muted">{t(risk.name)}: {t(risk.reason)}</p>}
          {!risk && smart && <p className="mt-2 text-sm text-muted">{t(smart.reason)}</p>}
        </>
      )}
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-forest-mid">
        {t("Open Predictive Kitchen")} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
