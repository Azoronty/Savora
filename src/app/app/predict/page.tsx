import { ArrowRight, CircleAlert, Hourglass, Scale, Telescope } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { SampleTag } from "@/components/inventory/product-row";
import { SmartQuantityButton } from "@/components/predict/smart-quantity-button";
import { EmptyState } from "@/components/ui/empty-state";
import { cx } from "@/lib/cx";
import { formatShortDate } from "@/lib/domain/dates";
import { formatMoney, formatQuantity } from "@/lib/domain/format";
import { PREDICT_RULES } from "@/lib/domain/predict";
import { getPrediction } from "@/lib/data/predict";
import { requireViewer } from "@/lib/data/session";

export const metadata: Metadata = { title: "Predictive Kitchen" };

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

export default async function PredictPage() {
  const viewer = await requireViewer();
  const p = await getPrediction(viewer);
  const ready = p.patterns.filter((x) => x.enoughData);

  return (
    <>
      <PageHeader
        eyebrow="Predictive Kitchen"
        title="What your history says"
        description="Built from what you bought, used and threw away. Plain statistics you can check below, with no outside AI service and no guessing."
      />

      {p.totalEvents === 0 ? (
        <EmptyState icon={<Telescope className="size-6" />} title="Nothing to learn from yet">
          Predictive Kitchen learns from real history: each product you add, use or throw away is recorded. After a couple of shopping trips the
          first patterns appear here.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-12">
          <section aria-label="Summary" className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-card lg:grid-cols-4">
            <Figure label="Items with patterns" value={ready.length} note={`${p.learning.length} still learning`} />
            <Figure label="Recorded events" value={p.totalEvents} note="Bought, used, thrown away" />
            <Figure label="At risk now" value={p.risks.length} note="From your stock" tone={p.risks.length ? "soon" : undefined} />
            <Figure label="Smarter amounts" value={p.suggestions.length} note="Overbuy detected" />
          </section>

          <div className="grid gap-10 lg:grid-cols-2">
            <section aria-labelledby="risk-heading">
              <SectionTitle id="risk-heading" icon={<Hourglass className="size-4" />} eyebrow="Waste prediction" title="Likely to go unused" />
              {p.risks.length === 0 ? (
                <Note>No item in stock looks at risk based on your history.</Note>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                  {p.risks.map((r) => (
                    <li key={r.productId} className="flex gap-4 p-5">
                      <span className={cx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", r.level === "high" ? "bg-expired-soft text-expired" : "bg-soon-soft text-soon")}>
                        <CircleAlert className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {r.name} <span className="ml-1 text-xs font-normal text-muted">{r.level === "high" ? "High risk" : "Watch"}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted">{r.reason}</p>
                        <Link href="/app/meals?filter=rescue" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-forest-mid hover:underline">
                          Recipes that use it <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="qty-heading">
              <SectionTitle id="qty-heading" icon={<Scale className="size-4" />} eyebrow="Overbuy detection" title="Smarter amounts" />
              {p.suggestions.length === 0 ? (
                <Note>No repeated overbuying found. Suggestions appear after {PREDICT_RULES.overbuyMinPurchases} purchases of the same item with regular leftovers.</Note>
              ) : (
                <ul className="flex flex-col gap-4">
                  {p.suggestions.map((s) => (
                    <li key={`${s.key}-${s.unit}`} className="rounded-xl border border-line bg-card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-medium">
                          {s.name} {p.demoKeys.has(s.key) && <SampleTag />}
                        </p>
                        <p className="shrink-0 font-mono text-sm tabular">
                          <span className="text-muted line-through decoration-line-strong">{formatQuantity(Math.round(s.usual * 100) / 100, s.unit)}</span>
                          <span className="mx-1.5 text-muted">→</span>
                          <span className="font-medium text-forest-mid">{formatQuantity(s.suggested, s.unit)}</span>
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted">{s.reason}</p>
                      <div className="mt-4">
                        <SmartQuantityButton name={s.name} itemKey={s.key} quantity={s.suggested} unit={s.unit} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section aria-labelledby="patterns-heading">
            <SectionTitle id="patterns-heading" icon={<Telescope className="size-4" />} eyebrow="Purchase history & consumption" title="Your patterns" />
            <div className="overflow-x-auto rounded-xl border border-line bg-card">
              <table className="w-full min-w-[720px] text-left text-sm tabular">
                <thead className="border-b border-line">
                  <tr className="eyebrow">
                    {["Item", "Bought", "Usually", "Every", "Last bought", "Thrown away", "Takes to use", "Confidence"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {p.patterns.map((x) => (
                    <tr key={`${x.key}-${x.unit}`} className={cx(!x.enoughData && "text-muted")}>
                      <th scope="row" className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-2">
                          {x.name}
                          {p.demoKeys.has(x.key) && <SampleTag />}
                        </span>
                      </th>
                      <td className="px-4 py-3">{x.purchases}×</td>
                      <td className="px-4 py-3">{x.purchases ? formatQuantity(Math.round(x.avgPurchase * 100) / 100, x.unit) : "—"}</td>
                      <td className="px-4 py-3">{x.intervalDays === null ? "—" : `${Math.round(x.intervalDays)} days`}</td>
                      <td className="px-4 py-3">{x.lastBought ? formatShortDate(x.lastBought) : "—"}</td>
                      <td className="px-4 py-3">
                        {pct(x.wasteShare)}
                        {x.wastedValueCents ? <span className="block text-xs text-muted">{formatMoney(x.wastedValueCents)} recorded</span> : null}
                      </td>
                      <td className="px-4 py-3">{x.daysToUse === null ? "—" : `${Math.round(x.daysToUse)} days`}</td>
                      <td className="px-4 py-3">{x.enoughData ? x.confidence : "Not enough data"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="method-heading" className="rounded-xl border border-line bg-paper-deep/50 p-6 text-sm text-ink-2">
            <h2 id="method-heading" className="mb-3 font-sans text-base font-medium text-ink">
              How the predictions work
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              <li>Every product added, used or thrown away is written to a history ledger by the database itself.</li>
              <li>Patterns need at least {PREDICT_RULES.minPurchases} purchases and 2 recorded outcomes; until then an item shows “Not enough data”.</li>
              <li>
                Overbuy: {PREDICT_RULES.overbuyMinPurchases}+ purchases and {Math.round(PREDICT_RULES.overbuyMinWasteShare * 100)}%+ thrown away. The smarter amount
                is your usual amount minus that share, rounded to a sensible step.
              </li>
              <li>Waste risk compares how long you usually take to use an item with the days left on its date, and how often it was thrown away before.</li>
              <li>Money figures come only from prices you entered. Rows tagged Sample come from the demo kitchen’s example history.</li>
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

function Figure({ label, value, note, tone }: { label: string; value: number; note: string; tone?: "soon" }) {
  return (
    <div className="border-line p-5 sm:p-6 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0">
      <p className="text-sm text-ink-2">{label}</p>
      <p className={cx("mt-3 font-display text-[2.4rem] leading-none tabular", tone === "soon" && "text-soon")}>{value}</p>
      <p className="mt-2 text-[0.8125rem] text-muted">{note}</p>
    </div>
  );
}

function SectionTitle({ id, icon, eyebrow, title }: { id: string; icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="eyebrow mb-1.5 flex items-center gap-2 [&_svg]:text-forest-mid">
        {icon}
        {eyebrow}
      </p>
      <h2 id={id} className="text-[1.5rem] font-normal">
        {title}
      </h2>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong p-5 text-sm text-muted">{children}</p>;
}
