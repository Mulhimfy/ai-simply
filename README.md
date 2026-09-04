# AI Briefs

**Know what matters in AI. In three minutes. Every day.**

A daily brief on what changed in AI, why it matters to you, and what to do about it — plus a
hand-tested toolbox and plain-English explainers for the depth behind the news.

**Live site:** [getaibriefs.com](https://getaibriefs.com)

## The product

The homepage *is* today's brief. Everything else supports it.

| Surface | Route | What it is |
| --- | --- | --- |
| Today | `/` | Today's brief: 5–6 items, each with what changed, why it matters, what to do, and what to try |
| Briefs | `/news/`, `/news/<date>/` | The archive; one dated brief is the shareable unit |
| Explainers | `/blog/…` | Long-form, plain-English background |
| Toolbox | `/tools/…` | 222 AI tools, tested and rated, with comparisons and alternatives |
| What to try | `/tools/quiz/` | Five questions to a concrete recommendation |
| My tools | `/saved/` | Per-visitor saved list (localStorage, no account) |

Readers tune the brief to the angles they care about (work, money, creators, builders, everyday
life, rules and power, research). Nothing is hidden — the chosen angles simply come first.

## Tech stack

- **Framework:** [Astro](https://astro.build), static output, deployed on Vercel
- **Content:** Markdown/MDX with Zod-validated schemas; briefs and news snapshots as JSON
- **Styling:** vanilla CSS with custom properties — one design system in `src/styles/global.css`
- **Type:** Inter, Instrument Serif, JetBrains Mono (self-hosted)
- **Icons:** Lucide, inlined at build time
- **Share images:** generated at build time with satori (`src/og/`)
- **Newsletter:** Beehiiv

## Getting started

```sh
npm install
npm run dev        # localhost:4321
npm run build      # static build to ./dist/
npm run preview    # serve the build
npm run verify     # check the preserved routes, SEO and monetization contracts (after a build)
```

## Project structure

```
src/
├── components/      # design-system components (Icon, ToolCard, BriefItems, …)
├── content/         # blog/ and tools/ collections (Markdown)
├── data/
│   ├── briefs/      # editorial briefs, one JSON per day
│   ├── news/        # raw RSS snapshots, one JSON per day
│   └── rating-criteria.ts
├── lib/             # brief.ts (the data model), news.ts, tools.ts, articles.ts, quiz.ts
├── layouts/         # Base.astro, BlogPost.astro
├── og/              # build-time share-card renderer
├── pages/           # routes
└── styles/global.css
```

## How the brief is made

1. `scripts/fetch-news.mjs` pulls eight AI feeds into `src/data/news/<date>.json` (daily, in CI).
2. `scripts/write-brief.mjs` turns that snapshot into an editorial brief in
   `src/data/briefs/<date>.json` — clustered stories, plain-English "why it matters", a suggested
   action, an angle, and tools worth trying. Needs `ANTHROPIC_API_KEY`; skips cleanly without it.
3. Any day without an editorial brief falls back to an automatic one derived from the snapshot.
   The UI degrades honestly: headlines and sources, never invented commentary.

See `docs/briefs.md` for editing briefs by hand, and `docs/REBUILD.md` for the design system and
page specs.

## Content

Articles live in `src/content/blog/`, tools in `src/content/tools/`. Both are validated against the
schemas in `src/content.config.ts`. Paid directory listings are documented in `docs/paid-listings.md`.

## License

All rights reserved.
