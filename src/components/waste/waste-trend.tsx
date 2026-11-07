"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatShortDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/format";

type Week = { weekStart: string; count: number; costCents: number };

/** Single-series weekly bars: one hue, thin marks, recessive axes, hover tooltip. */
export function WasteTrend({ weeks }: { weeks: Week[] }) {
  const data = weeks.map((w, i) => ({ ...w, label: i === weeks.length - 1 ? "This wk" : formatShortDate(w.weekStart) }));
  return (
    <div className="h-56 w-full" role="img" aria-label={`Items thrown away per week over the last ${weeks.length} weeks`}>
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
                  <p className="font-medium text-ink">Week of {formatShortDate(w.weekStart)}</p>
                  <p className="text-ink-2">
                    {w.count} {w.count === 1 ? "item" : "items"}
                    {w.costCents > 0 && ` · ${formatMoney(w.costCents)}`}
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
