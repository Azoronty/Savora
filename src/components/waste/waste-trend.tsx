"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatShortDate } from "@/lib/domain/dates";
import { useLang, useT } from "@/components/i18n/lang-provider";
import { formatMoney } from "@/lib/domain/format";

type Week = { weekStart: string; count: number; costCents: number };

/** Single-series weekly bars: one hue, thin marks, recessive axes, hover tooltip. */
export function WasteTrend({ weeks }: { weeks: Week[] }) {
  const t = useT();
  const lang = useLang();
  const data = weeks.map((w, i) => ({ ...w, label: i === weeks.length - 1 ? t("This wk") : formatShortDate(w.weekStart, lang) }));
  return (
    <div className="h-56 w-full" role="img" aria-label={t("Items thrown away per week over the last {n} weeks", { n: weeks.length })}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "var(--color-line-strong)" }}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "var(--color-paper-deep)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const w = payload[0].payload as Week & { label: string };
              return (
                <div className="rounded-md border border-line bg-card px-3 py-2 text-xs shadow-lift">
                  <p className="font-medium text-ink">{t("Week of")} {formatShortDate(w.weekStart, lang)}</p>
                  <p className="text-ink-2">
                    {t(w.count === 1 ? "1 item" : `${w.count} items`)}
                    {w.costCents > 0 && ` · ${formatMoney(w.costCents, lang)}`}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" fill="var(--color-chart)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
