import { Check, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { SaviSettings } from "@/components/savi/savi-settings";
import { cx } from "@/lib/cx";
import { isValidTimeZone } from "@/lib/domain/dates";
import { getRecipe } from "@/lib/domain/recipes";
import { SAVI_MISSIONS, SAVI_STAGES, SAVI_XP_RULES, saviProgress } from "@/lib/domain/savi";
import { getSaviState } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";

export const metadata: Metadata = { title: "Savi" };


function describe(kind: string, label: string | null): string {
  switch (kind) {
    case "product_added":
      return `Added ${label ?? "a product"}`;
    case "product_used":
      return `Used ${label ?? "a product"}`;
    case "food_rescued":
      return `Rescued ${label ?? "a product"} before its date`;
    case "recipe_cooked":
      return `Cooked ${label ? (getRecipe(label)?.title.toLowerCase() ?? label) : "a recipe"}`;
    case "shopping_stocked":
      return `Put away shopping (${label ?? "items"})`;
    case "mission_completed":
      return `Mission complete: ${SAVI_MISSIONS.find((m) => m.key === label)?.title ?? label}`;
    default:
      return kind;
  }
}

export default async function SaviPage() {
  const viewer = await requireViewer();
  const savi = await getSaviState(viewer, 12);
  const p = saviProgress(savi.xp);
  const timeFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: isValidTimeZone(viewer.timeZone) ? viewer.timeZone : "UTC",
  });

  const missionProgress = (key: string): [number, number] => {
    if (key === "rescue") return [Math.min(1, savi.today.food_rescued ?? 0), 1];
    if (key === "cook") return [Math.min(1, savi.today.recipe_cooked ?? 0), 1];
    return [savi.today.shopping_stocked ? 3 : Math.min(3, savi.today.product_added ?? 0), 3];
  };

  return (
    <>
      <PageHeader eyebrow="Your kitchen companion" title="Savi" description="Savi grows when food gets used instead of thrown away. Every XP point comes from something you actually did." />

      <section className="mb-12 grid overflow-hidden rounded-2xl border border-line bg-card md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative flex min-h-72 items-end justify-center bg-[radial-gradient(ellipse_at_50%_85%,var(--color-saffron-soft),transparent_65%)] p-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- small sprite */}
          <img src={`/savi/stage-${p.stage.n}.webp`} alt={`Savi at stage ${p.stage.n}, ${p.stage.name}`} className="savi-float relative h-56 w-auto drop-shadow-[0_18px_24px_rgba(20,42,30,0.22)]" />
        </div>
        <div className="flex flex-col justify-center gap-5 border-t border-line p-7 md:border-l md:border-t-0 sm:p-9">
          <div>
            <p className="eyebrow mb-2">Stage {p.stage.n} of 7</p>
            <h2 className="text-[2.4rem] font-normal leading-none">{p.stage.name}</h2>
            <p className="mt-2 text-muted">{p.stage.blurb}</p>
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="font-display text-3xl tabular">{savi.xp} XP</span>
              <span className="text-muted">{p.next ? `${p.xpToNext} XP to ${p.next.name}` : "Fully grown"}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.fraction * 100)} aria-label="Progress to next stage">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-chart),var(--color-saffron))]" style={{ width: `${Math.max(3, p.fraction * 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12" aria-labelledby="missions-heading">
        <p className="eyebrow mb-1.5">Food rescue missions</p>
        <h2 id="missions-heading" className="mb-5 text-[1.6rem] font-normal">Today</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {SAVI_MISSIONS.map((m) => {
            const done = savi.missionsDone.includes(m.key);
            const [have, need] = missionProgress(m.key);
            return (
              <li key={m.key} className={cx("flex flex-col rounded-xl border p-5", done ? "border-forest/25 bg-forest-wash" : "border-line bg-card")}>
                <div className="flex items-center justify-between">
                  <span className={cx("rounded-full px-2.5 py-0.5 font-mono text-xs", done ? "bg-forest text-card" : "bg-saffron-soft text-soon")}>+{m.xp} XP</span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-forest-mid">
                      <Check className="size-4" aria-hidden="true" /> Done
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-muted tabular">
                      {have}/{need}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-sans text-lg font-medium">{m.title}</h3>
                <p className="mt-1 text-sm text-muted">{m.detail}</p>
                {!done && (
                  <Link href={m.href} className="mt-auto pt-4 text-sm font-medium text-forest-mid hover:underline">
                    {m.cta} →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-12" aria-labelledby="stages-heading">
        <p className="eyebrow mb-1.5">Evolution</p>
        <h2 id="stages-heading" className="mb-5 text-[1.6rem] font-normal">Seven stages</h2>
        <ol className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
          {SAVI_STAGES.map((s) => {
            const unlocked = savi.xp >= s.minXp;
            const current = s.n === p.stage.n;
            return (
              <li
                key={s.n}
                className={cx(
                  "flex w-32 shrink-0 flex-col items-center rounded-xl border px-2 pb-4 pt-5 text-center sm:w-auto",
                  current ? "border-saffron bg-saffron-soft/40" : "border-line bg-card",
                )}
              >
                <div className="flex h-28 items-end">
                  {/* eslint-disable-next-line @next/next/no-img-element -- small sprite */}
                  <img
                    src={`/savi/stage-${s.n}.webp`}
                    alt={unlocked ? `Savi stage ${s.n}` : `Locked stage ${s.n}`}
                    className={cx("w-auto", unlocked ? "" : "opacity-[0.12] brightness-0")}
                    style={{ height: 56 + s.n * 7 }}
                  />
                </div>
                <p className="mt-3 font-mono text-[0.6875rem] text-muted">0{s.n}</p>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                  {!unlocked && <Lock className="size-3" aria-hidden="true" />}
                  {s.minXp} XP
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="xp-heading">
          <h2 id="xp-heading" className="mb-4 text-xl font-medium">How Savi grows</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
            {SAVI_XP_RULES.map((r) => (
              <li key={r.action} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <span>{r.action}</span>
                <span className="shrink-0 text-right">
                  <span className="font-mono font-medium tabular">+{r.xp}</span>
                  <span className="block text-xs text-muted">{r.cap}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.8125rem] text-muted">
            XP is recorded by the database when the action happens, with daily limits. Loading the sample kitchen earns nothing, and throwing food away
            never costs XP.
          </p>
          <h2 className="mb-4 mt-10 text-xl font-medium">Settings</h2>
          <SaviSettings mode={viewer.saviMode} />
        </section>

        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-4 text-xl font-medium">Recent activity</h2>
          {savi.recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-muted">
              Nothing yet. Add a product or mark something as used, and Savi will start growing.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
              {savi.recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{describe(e.kind, e.label)}</span>
                    <span className="text-xs text-muted">{timeFormat.format(new Date(e.created_at))}</span>
                  </span>
                  <span className={cx("shrink-0 font-mono text-sm tabular", e.xp ? "text-forest-mid" : "text-muted")}>+{e.xp}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
