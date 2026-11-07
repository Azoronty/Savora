# NOTAR Academy regulation → SAVORA checklist

Source: NOTAR Academy Selection regulation (PDF). The regulation is the final authority; every feature below is mapped to the criterion it serves.

## Mandatory deliverables (ch. 2.2, 6.1) — disqualifying if missing

| # | Requirement | Where it is met | Status |
|---|---|---|---|
| D1 | Working MVP on a public URL (Vercel or similar), opens without fatal errors | https://savora-mauve.vercel.app | Done, verified by e2e on the live URL |
| D2 | Open GitHub repository with README.md | Repository + `README.md` | Public repo `Azoronty/Savora` (new account; the old `0503jas-cmyk` was suspended) |
| D3 | PDF presentation: problem, solution architecture, key features | `submission/SAVORA-presentation.pdf` (the `/pitch` deck printed to PDF) | Done |
| D4 | Submission before 13 Nov, 23:59 | — | Deadline tracked |
| D5 | Key scenarios interactive, not static stubs (ch. 4.1) | Add/track/use/discard products, recipes, shopping, waste, Predictive Kitchen, Savi | Done |

## Visual style and interface cleanliness — 40% (ch. 3.2)

| Criterion | How SAVORA meets it |
|---|---|
| No "dirty AI design": no neon glows, no full-screen gradients, no random shadows, no chaotic spacing | Token-based palette (paper, forest, saffron); one shadow scale; presentation uses the same paper-and-forest system, no bloom or neon |
| Unified design system, contrast, readable text, clear interactive states | `globals.css` tokens, shared `ui/` primitives, WCAG AA text pairs, focus rings, hover/pressed/disabled states |
| Intuitive "zero friction" flows | Catalog autofill on add, quick dates, one-tap "Used", put-away from shopping list |
| Grid and typography care (ch. 3.1) | Fixed type scale (display serif + UI sans + mono labels), 4/8 px spacing rhythm, responsive grids checked at 390/1024/1440 px |

## Architecture depth and code — 40%

| Criterion | How SAVORA meets it |
|---|---|
| Clean code, component separation, typing | Strict TypeScript; `lib/domain` (pure logic) · `lib/data` (reads) · `lib/actions` (writes) · `components/` |
| Real backend logic and data structure for products and expiry | Supabase Postgres with RLS on every table, constraints, indexes, date-only expiry, atomic RPCs |
| Validation, efficient queries, fault-tolerant endpoints (ch. 3.1) | Zod on every Server Action, DB constraints, filtered/indexed queries, typed error mapping |
| Sensible use of AI tools; understandable code | Deterministic, documented algorithms; unit tests for every rule set |

## Product value — 20%

| Criterion | How SAVORA meets it |
|---|---|
| Elegant expiry control and waste reduction | Status states, week-ahead timeline, use-soon view, rescue missions |
| Practical scenarios: fast add, clear spoilage indicators, smart hints | Catalog autofill, freshness bars, insights, Predictive Kitchen (overbuy, smart quantity, waste risk) |
| Expected impact (ch. 2.1): fewer repeat purchases, less waste | Duplicate-aware shopping list, "already at home" warnings, smart quantities from real history |

## Release scope mapped to criteria

| Task | Criterion |
|---|---|
| Predictive Kitchen (history ledger, consumption stats, overbuy, smart quantity, waste risk) | Backend 40% · Product 20% |
| Savi moves through the interface, inspects product rows, evolves with real XP | UI/UX 40% · Product 20% |
| Savi gets two dedicated slides in the presentation | Presentation (D3) |
| Animated web presentation + PDF | Presentation (D3) |
| Tests: unit + e2e on the live deployment | Architecture 40% |
