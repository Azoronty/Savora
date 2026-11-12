import { ArrowRight, Bell, BookOpen, CalendarCheck, Check, CookingPot, Mic, Recycle, Refrigerator, ShoppingBasket, Sparkles, Telescope } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand/logo";
import { DemoButton } from "@/components/auth/demo-button";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LinkButton } from "@/components/ui/button";
import { getViewer } from "@/lib/data/session";

const PROBLEMS = [
  { title: "Out of sight, out of mind", body: "The yogurt behind the jars. The half bag of spinach in the drawer. Food gets wasted because it's forgotten, not because it's bad." },
  { title: "Dates slip past", body: "Nobody keeps every date in their head. By the time you notice, the decision has already been made for you." },
  { title: "Buying what you have", body: "Without a clear picture of home, it's easy to buy a second jar of something you already own." },
  { title: "No plan for leftovers", body: "Ingredients need a meal to go into. Without an idea, they sit until they're past using." },
];

const FACTS = [
  { value: "1.05 bn t", label: "of food wasted worldwide in 2022", source: "UNEP 2024" },
  { value: "60%", label: "of it thrown away at home", source: "UNEP 2024" },
  { value: "79 kg", label: "per person, per year, at home", source: "UNEP 2024" },
  { value: "73%", label: "of food thrown away at home was still edible", source: "WRAP, UK" },
];

const PLAN_PREVIEW = [
  { day: "Today", meal: "Berry & banana smoothie", uses: "yogurt · bananas · strawberries" },
  { day: "Tomorrow", meal: "Spinach & feta omelette", uses: "spinach · feta" },
  { day: "Thursday", meal: "Creamy mushroom pasta", uses: "mushrooms · cream" },
];

export default async function LandingPage() {
  const viewer = await getViewer();

  return (
    <div className="overflow-x-clip">
      <LandingMotion />
      {/* Navigation */}
      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden h-10 items-center rounded-md px-3 text-sm text-ink-2 hover:text-ink md:inline-flex">
              How it works
            </a>
            <a href="#features" className="hidden h-10 items-center rounded-md px-3 text-sm text-ink-2 hover:text-ink md:inline-flex">
              Features
            </a>
            {viewer ? (
              <LinkButton href="/app" size="sm" className="ml-2">
                Open your kitchen <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-ink-2 hover:text-ink">
                  Sign in
                </Link>
                <LinkButton href="/signup" size="sm" className="ml-1">
                  Get started
                </LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto grid max-w-[1240px] gap-12 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-center lg:gap-16 lg:pb-28 lg:pt-12">
          <div>
            <p data-hero className="eyebrow mb-6 flex items-center gap-2">
              <span className="h-px w-6 bg-saffron" aria-hidden="true" />
              Plan the week around what you already have
            </p>
            <h1 data-hero className="text-[3rem] font-light leading-[0.98] tracking-[-0.025em] sm:text-[4.25rem] lg:text-[5rem]">
              Know your kitchen.
              <br />
              <em className="font-normal italic text-forest-mid">Waste less of it.</em>
            </h1>
            <p data-hero className="mt-7 max-w-[30rem] text-lg leading-relaxed text-ink-2">
              Savora plans your meals so everything is cooked before its date, reminds you every morning, and lets you add a whole shop in one sentence.
            </p>
            <div data-hero className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-start">
              {viewer ? (
                <LinkButton href="/app" size="lg">
                  Open your kitchen <ArrowRight className="size-4" aria-hidden="true" />
                </LinkButton>
              ) : (
                <>
                  <div className="sm:w-60">
                    <DemoButton />
                  </div>
                  <LinkButton href="/signup" variant="secondary" size="lg">
                    Create a free account
                  </LinkButton>
                </>
              )}
            </div>
            <p data-hero className="mt-4 text-sm text-muted">
              The demo opens a sample kitchen instantly. No email needed.
            </p>
          </div>

          <div className="relative">
            <div data-hero-media className="relative aspect-[5/4] overflow-hidden rounded-[28px] bg-paper-deep">
              <Image
                src="/images/hero-kitchen.jpg"
                alt="Spinach, cherry tomatoes, eggs, feta, lemon and bread arranged on a linen-covered table"
                fill
                priority
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover object-left"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/25 via-transparent to-transparent" aria-hidden="true" />
            </div>

            {/* A real slice of the product: the rescue plan */}
            <div
              data-hero-card
              className="absolute -bottom-10 left-4 right-4 rounded-2xl border border-line bg-card/95 p-5 shadow-lift backdrop-blur sm:left-auto sm:right-8 sm:w-[23rem] lg:-left-12 lg:right-auto"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="eyebrow">Rescue plan · this week</p>
                <CalendarCheck className="size-4 text-forest-mid" aria-hidden="true" />
              </div>
              <ol className="flex flex-col gap-3">
                {PLAN_PREVIEW.map((d) => (
                  <li key={d.day} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                    <span className="pt-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted">{d.day}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.meal}</span>
                      <span className="block truncate text-xs text-soon">{d.uses}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-forest p-3.5 text-card">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-saffron" aria-hidden="true" />
                <p className="text-sm leading-snug">
                  <span className="font-medium">25 of 27 items used in time</span>
                  <span className="block text-card/75">The item with the least time left is planned first</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Scale */}
        <section aria-label="The scale of household food waste" className="mx-auto max-w-[1240px] px-5 pb-16 pt-6 sm:px-8 lg:pb-20">
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
            {FACTS.map((f) => (
              <li key={f.value} data-reveal className="bg-card p-5 sm:p-6">
                <p className="font-display text-[2.2rem] font-light leading-none text-forest tabular sm:text-[2.6rem]">{f.value}</p>
                <p className="mt-2 text-sm text-ink-2">{f.label}</p>
                <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-saffron">{f.source}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Problem */}
        <section aria-labelledby="problem-heading" className="border-y border-line bg-card/60">
          <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-20 lg:py-28">
            <div data-reveal>
              <p className="eyebrow mb-4">The problem</p>
              <h2 id="problem-heading" className="text-[2.4rem] font-light leading-[1.05] sm:text-[2.9rem]">
                Most food waste at home starts with forgetting.
              </h2>
            </div>
            <ol className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {PROBLEMS.map((p, i) => (
                <li key={p.title} data-reveal className="border-t border-line-strong pt-5">
                  <span className="font-mono text-xs text-saffron tabular">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-xl font-medium">{p.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What makes Savora different */}
        <section id="how" aria-labelledby="how-heading" className="mx-auto max-w-[1240px] scroll-mt-8 px-5 py-20 sm:px-8 lg:py-28">
          <div data-reveal className="mb-14 max-w-3xl">
            <p className="eyebrow mb-4">What makes Savora different</p>
            <h2 id="how-heading" className="text-[2.4rem] font-light leading-[1.05] sm:text-[2.9rem]">
              It doesn’t just remind you of dates. It plans how to use everything in time.
            </h2>
          </div>
          <ol className="grid gap-4 lg:grid-cols-3">
            <li data-reveal className="flex flex-col rounded-2xl border border-line bg-card p-7">
              <span className="font-display text-5xl font-light text-saffron tabular">01</span>
              <h3 className="mt-6 text-[1.45rem] font-normal">A rescue plan for the week</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                Meals are scheduled by deadline, so the food with the least time left is cooked first. Anything no meal fits gets a step: freeze it, eat it or add it to a soup.
              </p>
              <div className="mt-6 rounded-xl bg-paper-deep/70 p-4 text-sm">
                <p className="flex justify-between"><span className="text-muted">Reach their date this week</span><span className="font-medium tabular">27</span></p>
                <p className="mt-1.5 flex justify-between"><span className="text-muted">Used in time with the plan</span><span className="font-medium text-fresh tabular">25</span></p>
              </div>
            </li>
            <li data-reveal className="flex flex-col rounded-2xl border border-line bg-card p-7">
              <span className="font-display text-5xl font-light text-saffron tabular">02</span>
              <h3 className="mt-6 text-[1.45rem] font-normal">A reminder every morning</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                A real push notification at the hour you choose, in your time zone: what reaches its date by tomorrow and today’s rescue meal. It arrives even when the site is closed.
              </p>
              <div className="mt-6 flex gap-3 rounded-xl border border-line bg-paper p-3.5 shadow-soft">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-forest text-card"><Bell className="size-4" aria-hidden="true" /></span>
                <span className="min-w-0 text-sm leading-snug">
                  <span className="block font-medium">3 items reach their date by tomorrow</span>
                  <span className="block text-muted">Today’s rescue meal: spinach &amp; feta omelette (12 min).</span>
                </span>
              </div>
            </li>
            <li data-reveal className="flex flex-col rounded-2xl border border-line bg-card p-7">
              <span className="font-display text-5xl font-light text-saffron tabular">03</span>
              <h3 className="mt-6 text-[1.45rem] font-normal">A whole shop in one sentence</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                Say it or type it, in English or Russian. Savora splits it into products with amounts, storage and a typical date, ready to save in one tap.
              </p>
              <div className="mt-6 rounded-xl border border-line bg-paper p-3.5 text-sm">
                <p className="flex items-center gap-2 text-ink-2"><Mic className="size-4 shrink-0 text-forest-mid" aria-hidden="true" /> “milk 2 litres eggs 10 spinach”</p>
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {["Milk · 2 L", "Eggs · 10", "Spinach · 200 g"].map((c) => (
                    <span key={c} className="rounded-full bg-forest-wash px-2.5 py-1 text-xs font-medium text-forest-mid">{c}</span>
                  ))}
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-heading" className="scroll-mt-8 bg-forest text-card">
          <div className="grain">
            <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
              <div data-reveal className="mb-14 grid gap-6 lg:grid-cols-2 lg:items-end">
                <div>
                  <p className="eyebrow mb-4 !text-card/60">What’s inside</p>
                  <h2 id="features-heading" className="text-[2.4rem] font-light leading-[1.05] text-card sm:text-[2.9rem]">
                    Everything reads the same kitchen.
                  </h2>
                </div>
                <p className="max-w-md text-card/75 lg:justify-self-end">
                  The plan, the shopping list and the meal ideas all know what you have and what is about to expire, because they share one inventory backed by a real database.
                </p>
              </div>
              <ul className="grid gap-px overflow-hidden rounded-2xl border border-card/10 bg-card/10 sm:grid-cols-2 lg:grid-cols-3">
                <Feature icon={<CalendarCheck />} title="Rescue plan">
                  One to three meals a day for the next week, scheduled by deadline, with the reason for every meal and what it saves.
                </Feature>
                <Feature icon={<Bell />} title="Morning reminders">
                  Web push sent by the server every morning at your chosen hour, with what to use and what to cook. A test button proves it works.
                </Feature>
                <Feature icon={<Mic />} title="Voice and one-line entry">
                  Speak or type a shop in English or Russian. Your usual items are one tap away.
                </Feature>
                <Feature icon={<Refrigerator />} title="Inventory and dates">
                  Fridge, freezer and pantry in one list with Fresh, Use soon and Past date states and a seven-day timeline.
                </Feature>
                <Feature icon={<CookingPot />} title="Meal suggestions">
                  Recipes ranked by what expires first, with matched and missing ingredients and the reason each one is suggested.
                </Feature>
                <Feature icon={<ShoppingBasket />} title="Shopping list">
                  Stops duplicates, warns when you already have something, and moves bought items into the inventory.
                </Feature>
                <Feature icon={<Recycle />} title="Waste log">
                  Record what you throw away and why. See weekly trends, categories and the value of what you logged.
                </Feature>
                <Feature icon={<Telescope />} title="Predictive Kitchen">
                  Learns from your own history which foods tend to go unused and suggests buying a smaller amount.
                </Feature>
                <Feature icon={<BookOpen />} title="Explainable by design">
                  No black box: every suggestion says why it was picked, and every number comes from data you entered.
                </Feature>
              </ul>
            </div>
          </div>
        </section>

        {/* Savi */}
        <section aria-labelledby="savi-heading" className="mx-auto max-w-[1240px] px-5 pt-20 sm:px-8 lg:pt-28">
          <div className="overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(ellipse_at_50%_100%,var(--color-saffron-soft),transparent_60%),var(--color-card)]">
            <div className="grid gap-6 px-6 pt-10 sm:px-10 lg:grid-cols-2 lg:items-end lg:px-14 lg:pt-14">
              <div data-reveal>
                <p className="eyebrow mb-4">Meet Savi</p>
                <h2 id="savi-heading" className="text-[2.4rem] font-light leading-[1.05] sm:text-[2.9rem]">
                  A small companion that grows when food gets eaten.
                </h2>
              </div>
              <p data-reveal className="max-w-md text-ink-2 lg:justify-self-end">
                Savi gives you a guided tour on your first visit, lives in the corner of the app and reacts to what you do. Rescue food or cook from what you have, and Savi grows through seven forms, up to a Food Mage and the Food Guardian. Its XP comes only from real actions.
              </p>
            </div>
            <ol data-reveal className="-mb-2 flex items-end gap-3 overflow-x-auto px-6 pb-8 pt-10 sm:justify-between sm:px-10 lg:px-14">
              {["Seed", "Sprout", "Bud", "Harvest", "Chef", "Food Mage", "Food Guardian"].map((name, i) => (
                <li key={name} className="flex shrink-0 flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- small sprites */}
                  <img src={`/savi/stage-${i + 1}.webp`} alt={`Savi stage ${i + 1}: ${name}`} className="w-auto drop-shadow-[0_12px_16px_rgba(20,42,30,0.18)]" style={{ height: 64 + i * 18 }} loading="lazy" />
                  <span className="text-center">
                    <span className="block font-mono text-[0.6875rem] text-muted">0{i + 1}</span>
                    <span className="text-sm font-medium">{name}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Honest note */}
        <section aria-labelledby="note-heading" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-24">
          <div data-reveal className="grid gap-8 rounded-2xl border border-line bg-card p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="eyebrow mb-4">A note on dates</p>
              <h2 id="note-heading" className="text-[2rem] font-light leading-[1.1]">
                Savora tracks your dates. Your senses still have the final say.
              </h2>
            </div>
            <ul className="flex flex-col gap-4 text-[0.9375rem] text-ink-2">
              {[
                "Dates come from what you enter. Suggested dates are typical figures for quick entry, and you're always asked to check the package.",
                "“Past date” means the date you entered has passed. It's a prompt to check, not a verdict on whether food is safe.",
                "Money figures only appear when you've entered a price. Nothing is estimated or invented.",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-forest-mid" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-heading" className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8">
          <div data-reveal className="flex flex-col items-center rounded-[28px] bg-paper-deep px-6 py-16 text-center sm:py-20">
            <LogoMark className="mb-8 size-12" />
            <h2 id="cta-heading" className="max-w-2xl text-[2.4rem] font-light leading-[1.05] sm:text-[3.2rem]">
              Start with what’s already in your fridge.
            </h2>
            <p className="mt-4 max-w-md text-ink-2">Open the demo and look around, or create an account and add your first product in under a minute.</p>
            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {viewer ? (
                <LinkButton href="/app" size="lg">
                  Open your kitchen
                </LinkButton>
              ) : (
                <>
                  <div className="sm:w-60">
                    <DemoButton />
                  </div>
                  <LinkButton href="/signup" variant="secondary" size="lg">
                    Create a free account
                  </LinkButton>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>
            Built for the NOTAR Academy hackathon · Food waste at home ·{" "}
            <Link href="/pitch" className="font-medium text-forest-mid underline-offset-4 hover:underline">
              Presentation (RU)
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactElement<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <li data-reveal className="bg-forest p-7 transition-colors hover:bg-forest-mid/40">
      <span className="flex size-10 items-center justify-center rounded-full bg-card/10 text-saffron [&_svg]:size-5">{icon}</span>
      <h3 className="mt-6 text-xl font-normal text-card">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-card/70">{children}</p>
    </li>
  );
}
