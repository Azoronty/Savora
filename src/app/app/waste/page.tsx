import { Recycle } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { LogWasteButton, WasteLogList } from "@/components/waste/waste-log";
import { WasteTrend } from "@/components/waste/waste-trend";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORY_LABEL, WASTE_REASON_LABEL } from "@/lib/domain/constants";
import { formatShortDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/format";
import { computeWasteStats } from "@/lib/domain/waste";
import { listWasteRecords } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";

export const metadata: Metadata = { title: "Waste log" };

export default async function WastePage() {
  const viewer = await requireViewer();
  const records = await listWasteRecords(viewer, 180);
  const stats = computeWasteStats(records, viewer.today, 8);
  const maxCategory = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const delta = stats.thisMonth.count - stats.lastMonth.count;

  return (
    <>
      <PageHeader
        eyebrow="Last 6 months"
        title="Waste log"
        description="A record of food that didn't get used. Every number here comes from entries you logged — nothing is estimated."
        actions={<LogWasteButton today={viewer.today} />}
      />

      {records.length === 0 ? (
        <EmptyState icon={<Recycle className="size-6" />} title="Nothing logged yet">
          When something goes in the bin, choose “Throw away” on the item, or log it here. Patterns show up after a few entries.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-label="Summary" className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-card lg:grid-cols-4">
            <Figure label="Items logged" value={String(stats.count)} note="Last 6 months" />
            <Figure
              label="Logged value"
              value={formatMoney(stats.costCents)}
              note={stats.entriesWithCost === stats.count ? "All entries priced" : `From ${stats.entriesWithCost} of ${stats.count} entries with a price`}
            />
            <Figure
              label="This month"
              value={String(stats.thisMonth.count)}
              note={stats.lastMonth.count || stats.thisMonth.count ? `${delta === 0 ? "Same as" : `${Math.abs(delta)} ${delta < 0 ? "fewer than" : "more than"}`} last month` : "No entries yet"}
            />
            <Figure
              label="Top category"
              value={stats.byCategory[0] ? CATEGORY_LABEL[stats.byCategory[0].category] : "—"}
              note={stats.byCategory[0] ? `${stats.byCategory[0].count} of ${stats.count} items` : ""}
            />
          </section>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <section aria-labelledby="trend-heading" className="rounded-xl border border-line bg-card p-5 sm:p-6">
              <p className="eyebrow mb-1.5">Trend</p>
              <h2 id="trend-heading" className="mb-5 text-xl font-medium">
                Items thrown away per week
              </h2>
              <WasteTrend weeks={stats.weekly} />
              <details className="mt-4 text-sm">
                <summary className="text-muted hover:text-ink">View as table</summary>
                <table className="mt-3 w-full text-left tabular">
                  <thead>
                    <tr className="text-muted">
                      <th className="py-1 font-normal">Week of</th>
                      <th className="py-1 text-right font-normal">Items</th>
                      <th className="py-1 text-right font-normal">Logged value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.weekly.map((w) => (
                      <tr key={w.weekStart} className="border-t border-line">
                        <td className="py-1.5">{formatShortDate(w.weekStart)}</td>
                        <td className="py-1.5 text-right">{w.count}</td>
                        <td className="py-1.5 text-right">{formatMoney(w.costCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>

            <section aria-labelledby="cat-heading" className="rounded-xl border border-line bg-card p-5 sm:p-6">
              <p className="eyebrow mb-1.5">Breakdown</p>
              <h2 id="cat-heading" className="mb-5 text-xl font-medium">
                By category
              </h2>
              <ul className="flex flex-col gap-3.5">
                {stats.byCategory.map((c) => (
                  <li key={c.category}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span>{CATEGORY_LABEL[c.category]}</span>
                      <span className="text-ink-2 tabular">
                        {c.count}
                        {c.costCents > 0 && <span className="text-muted"> · {formatMoney(c.costCents)}</span>}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-paper-deep" aria-hidden="true">
                      <div className="h-2 rounded-full bg-chart" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <h3 className="mb-3 mt-8 font-sans text-sm font-medium text-ink-2">Most common reasons</h3>
              <ul className="flex flex-wrap gap-2">
                {stats.byReason.map((r) => (
                  <li key={r.reason} className="rounded-full border border-line-strong px-3 py-1 text-xs text-ink-2">
                    {WASTE_REASON_LABEL[r.reason]} <span className="tabular text-muted">· {r.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section aria-labelledby="log-heading">
            <h2 id="log-heading" className="mb-4 text-xl font-medium">
              All entries
            </h2>
            <WasteLogList records={records} />
          </section>
        </div>
      )}
    </>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-line p-5 sm:p-6 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-3 truncate font-display text-[2.2rem] leading-none tabular">{value}</p>
      <p className="mt-2 text-[0.8125rem] text-muted">{note}</p>
    </div>
  );
}
