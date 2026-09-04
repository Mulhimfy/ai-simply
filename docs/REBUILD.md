# AI Briefs — Rebuild Brief ("Ink & Signal")

## THE PRODUCT (read this first — it changed on 2026-09-04)

AI Briefs is **not a tools directory** and not "AI explained simply" content marketing. It is a
**daily 3-minute brief: what changed in AI today, why it matters to you, and what to do about it.**

- **Centre of gravity: the Brief.** The homepage *is* today's brief. `/news/` is the archive of briefs;
  `/news/<date>/` is one brief (shareable, the unit of virality). The data model lives in
  `src/lib/brief.ts` (`allBriefs`, `autoBrief`, `editorialBrief`, `ANGLES`); editorial briefs live in
  `src/data/briefs/<date>.json` (see 2026-09-02 for the reference example: 6 items, each with
  `headline`, `why` (what changed + why it matters, plain English), `action` (what to do), `angle`
  (work | money | creators | builders | everyday | policy | science), `tools` (what to try), `sources`).
  Days without an editorial file get an automatic brief built from the RSS snapshot (headline clusters,
  angle, coverage count, matched tools; `why` is empty — the UI must degrade gracefully: show the
  headline, sources and angle, never fake copy).
- **Value promise on every surface:** "Know what matters. In 3 minutes. Every day." + "…and what to do about it."
- **Personal angle, no login:** a visitor picks the angles they care about (chips: Your work, Money,
  Creators, Builders, Everyday life, Rules & power, Research). Stored in localStorage `aib-angles`; the
  brief reorders/highlights items for them ("For you" first, "Everything else" after). Never hide items.
- **Retention loop:** the daily ritual — streak (`aib-news-days`), "new since your last visit",
  yesterday/tomorrow navigation, a reading-progress ring on the brief, the newsletter as "the brief in your inbox".
- **Virality loop:** every brief and every item has a share card (`ogUrl('news', date)`), one-tap share
  copy written for a friend ("The 3-minute AI brief for {date}: {title}"), "Send today's brief" button,
  per-item deep links (`/news/<date>/#<item id>`), and the quiz result share. Explainers end with
  "Send this to someone who's confused about AI".
- **Supporting cast (kept for SEO and depth, demoted in the IA):** Explainers (`/blog/…`, was
  "Articles"), the Toolbox (`/tools/…`, the directory — every route stays, but it is a reference
  section, not the product), "What to try" (`/tools/quiz/`, was "Find my tool"). Nav order:
  Today · Briefs · Explainers · Toolbox · What to try. Header CTA: "Get the brief".
- **Tone:** a smart friend who reads everything so you don't have to. Confident, specific, short.
  No hype, no "best AI tools", no "explained simply" slogans. Sentence case.


This is the single source of truth for the 2026 rebuild of getaibriefs.com. Every page is being
rebuilt from scratch against a shared design system. Read this whole file before touching a page.

Companion docs (read the sections relevant to your page):
- `/tmp/claude-0/-root/e336f0cf-3ba3-4534-8bf1-b6fff6b4dc06/scratchpad/AUDIT.md` — what every old route did, and the **MUST PRESERVE** list (§7).
- `/tmp/claude-0/-root/e336f0cf-3ba3-4534-8bf1-b6fff6b4dc06/scratchpad/BENCHMARK.md` — the AAA checklist (§2) and reference teardowns.

## 0. Non-negotiables

1. **Every route keeps its URL.** No slug changes. Redirects in `vercel.json` stay. Sitemap/noindex rules in `astro.config.mjs` stay.
2. **Preserve monetization + SEO hooks**: Beehiiv (`BEEHIIV_FORM_URL`), Formspree, Polar checkout contract in `/submit`, `affiliateUrl` + `rel="sponsored"`, GA4 `G-XP68CXTJCM`, JSON-LD per page (same types as before — see AUDIT §1), `noindex` prop where the old page had it.
3. **No emoji as UI.** Use `<Icon name="…" />` (Lucide). Category icons: `CATEGORY_ICONS` in `src/consts.ts`. Blog categories: `BLOG_CATEGORIES`.
4. **No third-party hotlinks for logos.** Use `<ToolLogo slug name size />` (local `/logos/<slug>.png` with lettermark fallback). Screenshots: `/tools/<slug>.jpg` (1200×630, 207 of 222 tools have one — check `existsSync('public/tools/<slug>.jpg')`).
5. **Both themes must look finished.** Never hardcode colours; use tokens. Test light and dark.
6. **Motion doctrine**: transform/opacity only; `var(--ease-out)`; 200–520ms; stagger 40–45ms via `data-stagger`; nothing animates on keyboard focus; `prefers-reduced-motion` is handled globally (don't add animations that bypass it).
7. **Performance**: no client framework. Vanilla `<script>` per page only where needed. Images: `loading="lazy"` except the first hero image. No layout shift (always set width/height or aspect-ratio).
8. **Copy tone**: plain English, confident, short. Sentence case. No hype words ("revolutionary", "game-changing"). Use the serif-italic accent word sparingly: one per hero, e.g. `Find the right tool, <em class="serif">fast</em>.`

## 1. The system (already built — use it, don't fork it)

Layout: `src/layouts/Base.astro` — props: `title, description, image?, type?, publishDate?, updatedDate?, category?, noindex?, bodyClass?, noNudge?`. It renders header, footer, ⌘K palette, toasts, scroll-reveal. Put page content in the default slot; extra `<head>` tags in `slot="head"`.

Components (`src/components/`):
- `Icon` — `name` (lucide), `size`, `strokeWidth`, `class`, `title`.
- `ToolCard` — `slug name description category subcategory pricing rating ratingCount tags featured sponsored verified pubDate variant('grid'|'row'|'mini') media eager`. Includes the Save (bookmark) button which persists to `localStorage['aib-saved']` and dispatches `aib:saved-change`.
- `ToolLogo` — `slug name size`.
- `Stars` — `rating count size showNumber`.
- `ArticleCard` — `slug title description category pubDate readingTime heroImage author variant('feature'|'grid'|'row'|'text') index eager`.
- `Breadcrumb` — `items=[{name, href}]` (Home is prepended automatically). Emits BreadcrumbList JSON-LD.
- `Newsletter` — `variant('band'|'card'|'inline') heading text id`. Use `*word*` in heading for the serif accent.
- `Logo` — wordmark. `Header`, `Footer`, `CommandPalette`, `ScrollReveal` — global, don't include manually.
- `FormattedDate`, `ShareButtons` — legacy; you may rewrite ShareButtons (see §4).

CSS (`src/styles/global.css`) — tokens and primitives. Key classes:
- Layout: `.container`, `.container--wide|--narrow|--prose`, `.section`, `.section--tight`, `.section-head` (+ `__title`, `__desc`), `.grid .grid--2|3|4|auto`, `.stack`, `.row`, `.between`, `.divider`, `.scroll-x`.
- Type: `h1–h4`, `.display`, `.serif` (italic accent), `.lead`, `.muted`, `.meta`/`.mono` (uppercase mono labels), `.eyebrow` (orange dot + mono label), `.tnum`.
- Surfaces: `.card`, `.card--pad|--hover|--sunk|--glass|--ink|--accent`, `.glass`, `.bg-grid`, `.bg-dots`, `.glow`, `.grain`.
- Controls: `.btn`, `.btn--accent|--ghost|--soft|--link|--sm|--lg|--icon`, `.link-arrow`, `.link-u`, `.pill`, `.pill--free|--freemium|--paid|--accent|--outline|--ink|--live`, `.chip` (+ `aria-pressed="true"`), `.kbd`, `.input`, `.field`.
- Motion: `data-reveal` (+ `="scale"|"left"|"right"`), `data-stagger` on a parent (children auto-reveal staggered), `data-tilt` (3D hover), `data-magnetic`, `data-count="1234" data-suffix="+"` (count-up), `.hover-lift`, `.marquee > .marquee__track`, `.shimmer`.
- Prose: `.prose` (+ `.dropcap` on first paragraph).
- Global JS helpers: `window.__aib.toast(msg)`, `[data-copy="url"|"text"]` buttons, `<time data-relative datetime>` relative times, `[data-theme-toggle]`, `[data-palette-open]`.

Data helpers: `src/consts.ts` (`TOOL_CATEGORIES`, `CATEGORY_ICONS`, `BLOG_CATEGORIES`, `SUBCATEGORY_INTROS`, `TOOL_LISTING`, `BEEHIIV_FORM_URL`, `TOOL_OF_THE_WEEK`), `src/lib/related-articles.ts`, `src/utils/news.mjs`, `src/og/url.ts` → `ogUrl(kind, slug)` for share images (kinds: tool, blog, vs, category, news; pass to Base `image=`).

## 2. Visual language

- Warm paper light theme / warm ink dark theme. One accent (signal vermilion). Accent is for marks, CTAs, live dots, highlights — never large backgrounds except the `.card--accent` promo tile.
- Hierarchy from luminance and weight, not colour. Hairline borders (`var(--line)`), shadows only on hover/lift and overlays.
- Headlines: Inter 600, tight tracking; one Instrument Serif italic word for warmth. Labels/timestamps: JetBrains Mono uppercase small.
- Rhythm: sections separated by `var(--section)` (64–128px). Card grids gap 20px. Max width 1280 (wide 1440).
- Radii: cards 20px, inputs 14px, pills full. Buttons are pills.
- Density: comfortable by default; listings may offer a compact toggle.
- Imagery: tool screenshots in cards (top-aligned, subtle zoom on hover), logos in 44px rounded squares, article heroes 16:9/16:10.

## 3. Page assignments and specs

Each page: rebuild file in place (same path). Use `Base.astro`. Keep frontmatter data logic (adapt from the old file — the AUDIT tells you what it loaded). Keep JSON-LD. Delete old `<style>` fully; write fresh scoped styles using tokens.

### A. Home `/` — Today's brief (`src/pages/index.astro`)
Purpose: the product. A visitor lands, reads today's brief in 3 minutes, feels smarter, comes back tomorrow, sends it to a friend.
Data: `allBriefs(import.meta.glob('../data/news/*.json',{eager:true}), import.meta.glob('../data/briefs/*.json',{eager:true}), toolsLite)[0]`.
Sections in order:
1. **Brief header** (not a marketing hero): eyebrow "Today's brief · {weekday, date} · {readingMinutes} min read · {storyCount} stories from {sourceCount} sources"; the brief `title` as the display headline (serif italic on one key word is optional); `intro` as lead when editorial; angle chips row ("Tune for you": toggles saved to `aib-angles`); streak chip; ShareBar ("Send today's brief"); reading-progress ring (small, fixed, fills as you scroll the items).
2. **The items**: numbered 01–06, each a full-width editorial block: angle pill + coverage pill ("3 sources"), headline (h2, linkable `id`), `why` paragraph (when present), `action` line with an arrow icon ("What to do"), "What to try" mini tool cards (`ToolCard variant="mini"`), source links row (favicon-free: outlet name + external icon, `rel="noopener noreferrer"`, `target=_blank`), per-item copy-link. "For you" items first when angles are set (client-side reorder with FLIP animation via transforms, or simple reorder + fade).
3. **Everything else today**: compact timeline of the remaining snapshot stories (`NewsTimeline compact`) collapsed behind "Show the other {n} stories".
4. **Yesterday / This week**: prev-brief card + "Top of the week" (3 items deduped across the last 7 briefs).
5. **Explainers for this week's news**: 3 `ArticleCard`s chosen by keyword overlap with today's items (fallback newest).
6. **Newsletter band**: "The brief, in your inbox, 7am." (Beehiiv form).
7. **From the Toolbox**: tool of the day (deterministic) + link to `/tools/`. Small.
The hero must NOT be a carousel, a search box, or a "browse 220 tools" pitch. Search stays in the header (⌘K). Keep a `<form method="GET" action="/tools/">` somewhere unobtrusive (footer already links the toolbox) — the SearchAction contract only requires `/tools/?q=` to work.

### B. Tools directory (`src/pages/tools/index.astro`, `tools/category/[slug].astro`, `tools/category/[cat]/[sub].astro`, `tools/tag/[tag].astro`, `tools/new.astro`, `tools/top-rated.astro`, `tools/collections.astro`)
One shared listing experience: header (title, count, description/intro), sticky filter bar (search input, pricing chips All/Free/Freemium/Paid, sort: Top rated / Newest / A–Z, density toggle Comfortable/Compact, result count), category rail (horizontal scroll chips with counts + icons) and an optional subcategory chip row. Grid of `ToolCard` (compact = `row` variant). Filtering is client-side over the rendered cards using the `data-*` attributes; sync state to URL (`?q=&pricing=&sort=`) and support `?q=` on load (SearchAction contract). Show 24, "Show more" button reveals 24 more (cards are in DOM but `hidden` until revealed — keep DOM but don't render images eagerly). Empty state with a "Suggest a tool" link. Put the shared JS+CSS in `src/components/ToolListing.astro` (renders the bar + grid given a `tools` array + options) so all listing pages are identical. Keep ItemList JSON-LD on category pages, the `MIN_TOOLS_FOR_INDEX = 3` noindex rule on subcategory pages, `noindex` on tag pages, SUBCATEGORY_INTROS text.
`/tools/new/`: time-bucketed (This week / This month / Earlier) like Product Hunt. `/tools/top-rated/`: ranked list rows with big serif rank numbers, score, category, and do NOT invent ratingCount. `/tools/collections/`: curated stacks as bento tiles → each expands to its tools.

### C. Tool detail (`src/pages/tools/[slug].astro`) + `tools/alternatives/[slug].astro`
Hero: breadcrumb; logo 72; name; verified badge; one-liner; pills (category link, subcategory, pricing); `Stars` with count; meta row "Updated {date}"; CTAs: Visit (affiliateUrl ?? url, `rel="sponsored"` if affiliate, `data-track="visit"` GA event preserved), Save, Share (see §4), Compare (adds to compare tray §4). Right: screenshot in a browser-frame card (`data-tilt`) that opens the site. Body: two-column — prose (`.prose`) with a sticky table of contents generated from h2s; sidebar: "At a glance" card (category, pricing, rating, best for = first pro, updated), Pros/Cons card (two columns, check/x icons), "Alternatives" mini cards (same subcategory, top 4 by rating), "Compare" links to indexable vs pages, share card. Below: "More in {category}" 4 cards, related articles (`relatedArticlesForTool`), Newsletter `card`. Keep the SoftwareApplication+Product+Review JSON-LD exactly (fix the hardcoded 9.99 price: use `priceRange` semantics — for paid tools omit `price` rather than lie; free/freemium → 0). Owner claim link preserved. Alternatives page: noindex, list of same-subcategory tools as `row` cards with a "why switch" intro; keep structure but make it beautiful.

### D. Compare `tools/vs/[slug].astro` + new `tools/vs/index.astro`
Keep `getStaticPaths` pairing logic and `isTestBatch` noindex gate exactly. Page: hero with two logos and a serif italic "vs", quick verdict strip (winner per criterion when both rated: rating, pricing, verified, etc.), a comparison table (sticky first column, rows: Rating, Pricing, Category, Best for, Pros (top 3), Cons (top 3), Visit), "Our take" prose (template-generated is fine but label it "Quick take"), and CTAs. Add an index page `/tools/vs/` (new, indexable) listing the indexable comparisons grouped by subcategory. Share image via `ogUrl('vs', slug)` (only exists for rated pairs; fall back to default).

### E. Quiz `tools/quiz/`
Keep scoring engine + `?r=` share contract. Rebuild as a full-screen stepper: progress bar, one question per screen with animated transitions (slide/fade), option cards with icons (map old emoji to Lucide), keyboard 1–9 shortcuts, back button. Results: top match as a big card (logo, screenshot, why it matched = bullet reasons derived from the answers), 2 runners-up, "also consider" list, and a **share block**: "Share my match" with copy-link + X/LinkedIn/WhatsApp intents + the OG card preview (`ogUrl('tool', slug)`), plus "Retake". Save the result in localStorage so the header can show "Your match" later. Do not render "match %" as fake precision; show "Best match" / "Strong match" / "Good match" tiers.

### F. Articles (`src/layouts/BlogPost.astro`, `blog/index.astro`, `blog/[...slug].astro`, `blog/category/[category].astro`, `reviews.astro`, `tutorials.astro`, `author/*.astro`)
Blog post: reading experience first. Hero: eyebrow (category · reading time · date), h1 (display), lead (description), author row (avatar from consts, name, role), hero image 16:9 rounded. Body: `.prose` with `.dropcap`, sticky TOC (desktop) with scroll-spy, reading progress bar at top, mid-article newsletter `card`, FAQ accordion (`<details>` styled) with FAQPage JSON-LD preserved, share bar (copy link, X, LinkedIn, native share on mobile) both top and end, "Tools mentioned" (match tool names in body → `mini` cards), related articles (3), prev/next. Keep BlogPosting JSON-LD + optional ItemList. `/blog/` index: feature card + filter chips (client-side + URL sync) + grid; identical card design on category pages. Reviews: rated tools as ranked rows with score + methodology strip (import the criteria from one shared data file `src/data/rating-criteria.ts` — create it — used by `/reviews/` and `/rating-methodology/`). Tutorials: articles in `guides` + `how-ai-works` categories (define this rule in code). Author pages: avatar, bio, socials, article list.

### G. Briefs archive + one brief (`news/index.astro`, `news/[date].astro`)
`/news/` = "Briefs": hero "Every day, in 3 minutes." + streak + subscribe; today's brief summary card (title, intro, 6 headlines as a list, "Read today's brief"); the last 30 days as a heat strip; then a list of past briefs as rows (date, title, item count, angles as tiny dots) grouped by month. RSS link.
`/news/[date]/` = one brief, rendered by the SAME component as the home page items (create `src/components/BriefItems.astro` and `BriefHeader.astro`; the home page imports them — coordinate: the Briefs agent owns these components, the Home agent consumes them). Prev/next day nav, "Back to today", ShareBar with `ogUrl('news', date)`, `noindex` preserved on dated pages, per-item anchors. Client scripts: streak (`aib-news-days`, 1-day grace) and last-visit divider (`aib-last-visit-news`), angle personalisation (`aib-angles`).
Design: editorial, calm, numbered items with generous whitespace, a thin mono time/coverage rail, both themes. Mobile-first.

### H. Submit / pricing / static (`submit/index.astro`, `submit/success.astro`, `pricing.astro`, `about.astro`, `contact.astro`, `privacy.astro`, `terms.astro`, `rating-methodology.astro`, `proxy.astro`, `404.astro`)
Submit: two-step flow preserved byte-for-byte in behaviour (Formspree POST, ref generation, sessionStorage, Polar link with `customer_email` + `reference_id`, checkbox gate), redesigned as a clean two-column page: form left, "What you get" + price card right, trust points, FAQ. Success page: confirmation card, keep the second Formspree POST + noindex. Pricing: three tiers as cards with the accent middle tier, FAQ accordion. About: mission, how we test (criteria), team card, stats. Contact: form (Formspree) + `?subject=claim&tool=` prefill preserved. Privacy/Terms: `.prose` with TOC. Rating methodology: criteria table from `src/data/rating-criteria.ts` with weight bars. Proxy: keep the iframe, brand the wrapper, add a short intro; it stays out of the primary nav. 404: playful — big serif "Lost?", search input (palette), random tool button, links.

## 4. Site-wide features (owned by the "platform" agent, used by pages)
- `src/components/ShareBar.astro`: copy link (toast), X, LinkedIn, WhatsApp, Reddit intents, native `navigator.share` on mobile; props `title url`. Emits GA event `share`.
- Compare tray: `src/components/CompareTray.astro` included in Base; `[data-compare="slug"]` buttons add up to 3 tools (localStorage `aib-compare`); tray slides up from the bottom showing logos, "Compare" opens `/tools/vs/a-vs-b/` if that static page exists (index of existing vs slugs is in `/search-index.json` under `vs`, add it) else `/tools/vs/?a=&b=` which the vs index page handles client-side by showing a lightweight side-by-side from the search index.
- Saved tools page `/saved/` (new, noindex): reads `aib-saved`, renders cards from the search index client-side, share as URL (`?t=slug,slug`).
- "New since your last visit" divider on `/tools/new/` and `/news/` (localStorage `aib-last-visit`).
- Reading streak on `/news/`: localStorage days visited; show a small flame + streak count in the news hero (grace of 1 day).
- Keyboard shortcuts: `⌘K`/`/` search, `g t` tools, `g n` news, `g a` articles, `?` shows a shortcuts sheet.
- Add `vs` slugs to `search-index.json`.

## 5. Verification (every agent, every page)
1. `export PATH=/root/.cache/node/bin:$PATH`.
2. **Use the SHARED dev server at http://127.0.0.1:4321** — it is already running and stays up. Do NOT start your own (a server backgrounded inside a Bash call gets killed when that call ends). Check it with `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4321/`. If it is down, start it with the Bash tool's `run_in_background: true` and the command `export PATH=/root/.cache/node/bin:$PATH && npx astro dev --port 4321 --host 127.0.0.1` — never with `&` inside a foreground call.
   Astro dev renders per route, so another agent's broken page does not block yours (only a shared import would).
3. Screenshot with `node /tmp/claude-0/-root/e336f0cf-3ba3-4534-8bf1-b6fff6b4dc06/scratchpad/shoot.mjs <outdir> http://127.0.0.1:4321 /path1/ /path2/` — desktop 1440 + mobile 390, full page. `LIGHT=1` for the light theme, `FOLD=1` for viewport-only. Copy the script under your own name if you need to tweak it (e.g. sanitising query strings in filenames).
4. **Look at the screenshots** with the Read tool. Fix anything not premium: overflow, clipped text, tiny tap targets, bad contrast, empty states, misaligned grids, orphaned words in headlines, missing hover states, layout shift.
5. Check the page console has no errors (the script prints them).
6. Leave no TypeScript errors in frontmatter; the full `npm run build` must pass at the end of the programme. `npm run verify` (scripts/verify-contracts.mjs) checks the MUST PRESERVE contracts after a build.

## 5b. Verification budget (added 2026-09-04 — MANDATORY)

Screenshot review is the most expensive thing an agent does. Stay inside this budget:

- **Two review rounds maximum per page set.** Not three, not "until perfect".
- **Use `FOLD=1`** (viewport-only shots) for routine checks. Take a full-page shot only once per
  page, in the final round.
- **Look at at most 4 images per round.** Choose the ones most likely to reveal a defect
  (usually: desktop above the fold, mobile above the fold, and one long page).
- **Light theme: one spot check**, not a full parallel set. Token colours are shared, so if dark is
  right, light is almost always right. Check one representative page per theme.
- **Prefer cheap checks over screenshots**: `curl -s <url> | grep` for structure, JSON-LD, noindex
  and copy; the harness's "N elements still hidden" warning for reveal bugs; the browser console
  line it prints for JS errors. Only reach for an image when the question is genuinely visual.
- Do not re-shoot a page you did not change.

## 6. Definition of done
A reviewer will compare your page side-by-side against Linear/Vercel/The Verge/Product Hunt screenshots and the AAA checklist. It passes when they cannot name a concrete thing that looks cheaper than those references, and when every MUST PRESERVE item for your route is verified.

## 7. Copy integrity (added 2026-09-04 — applies to every page)

These are honesty rules, not style preferences. A reviewer will fail a page that breaks them.

- **No invented social proof.** Never "read by people at X", "trusted by N teams", "join 10,000 readers", star counts we do not have, or review counts we did not collect. If a number is not derivable from the repo, do not print it.
- **No cadence we do not control.** Briefs are published *every day* (snapshots exist for weekends), so "every morning" and "every day" are true; "every weekday", "weekly", "one email a week" are not. The newsletter is a Beehiiv list whose sending cadence we do not set here — say "the brief, in your inbox", never a frequency promise.
- **The dead slogan.** "AI, explained simply" and variants are retired. The promise is `SITE_TAGLINE`: "Know what matters in AI. In three minutes. Every day."
- **No "best AI tools" directory marketing.** The Toolbox is a reference section: "222 tools, tested and rated". Never "discover the best", "top AI tools 2026" in UI copy (existing article titles are content and stay as written).
- **Reading time must be real** — computed from the brief or the article, never asserted.
- **Ratings**: show `ratingCount` only when the tool actually has one. Never default it.
- **Never invent a citation.** Every `sources[].link` in an editorial brief must appear verbatim in
  that day's `src/data/news/<date>.json`. Reconstructing a plausible-looking URL is the worst thing
  this site could ship, and `npm run verify` now fails the build if it happens. (This rule exists
  because it was violated once during the rebuild and caught by the checker.)
- **Automatic briefs** show headlines, sources and angle only. Never render an empty "Why it matters" heading and never generate commentary at render time.

## 8. Astro gotchas that cost us real bugs

- **A `class` passed to a component does not receive the parent's scope.** `<Icon class="foo" />`
  puts `foo` on the *child's* root, which carries the child's `data-astro-cid`, so a scoped rule
  `.foo { … }` in the parent compiles to `.foo[data-astro-cid-PARENT]` and matches nothing. Nothing
  errors — the styling just never happens. This shipped a theme toggle with both sun and moon glyphs
  stacked on every page, logos dropped out of a comparison grid, and 26 other dead rules.
  **Fix:** `:global()` under a scoped ancestor — `.icon-btn :global(.icon-sun) { … }`.
  **Guard:** `npm run lint` (scripts/lint-scoped-icons.mjs) fails on any such selector, and
  `npm run verify` runs it first.
- **Markup built with `innerHTML` never carries the page scope either.** Anything a script injects
  must be styled in a `<style is:global>` block, scoped under an id you control.
- **Never write `<=` inside an Astro template expression** — the compiler reads `<` as a tag open.
  Use `!(a > b)` or move the comparison into the frontmatter.
- **Module state survives a view transition.** A `lastRendered` guard at module scope will make a
  client-side navigation back to the page render nothing. Reset it on `astro:after-swap`.
