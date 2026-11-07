import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="grain relative hidden flex-col justify-between overflow-hidden bg-forest p-12 text-card lg:flex">
        <Logo tone="paper" />
        <div className="relative max-w-md">
          <p className="font-display text-[2.6rem] leading-[1.08] text-card">
            The food you already have is the easiest food to save.
          </p>
          <ul className="mt-10 flex flex-col gap-4 text-[0.9375rem] text-card/80">
            {[
              "See what needs using in the next few days",
              "Meal ideas built around what's about to expire",
              "A shopping list that knows what's already at home",
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-2.5 h-px w-5 shrink-0 bg-saffron" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-card/50">Household food, managed with care</p>
        <svg className="pointer-events-none absolute -bottom-24 -right-24 size-[26rem] text-card/[0.05]" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M9.5 22.5C9.5 14.5 14.5 9.5 22.5 9.5c0 8-5 13-13 13Z" fill="currentColor" />
        </svg>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
