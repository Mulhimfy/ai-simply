# Open Graph share cards

Every tool, article, comparison, category and daily news page gets a 1200×630
PNG share card, rendered **at build time** — no browser, no runtime function.
The pipeline is `src/og/render.ts` → [satori](https://github.com/vercel/satori)
(element tree → SVG) → [resvg](https://github.com/yisibl/resvg-js) (SVG → PNG)
→ `sharp` (PNG re-compression).

## Files

| Path | Purpose |
| --- | --- |
| `src/og/render.ts` | `renderOg(opts)` — all card variants, brand tokens, font + image caches |
| `src/og/url.ts` | `ogUrl(kind, slug)` / `ogUrlAbsolute(kind, slug)` — the path a page should reference |
| `src/og/fonts/` | Static TTFs satori needs (Inter Medium/SemiBold, Instrument Serif Italic). The variable WOFF2s in `public/fonts/` cannot be used by satori. |
| `src/pages/og/tools/[slug].png.ts` | one card per tool |
| `src/pages/og/blog/[slug].png.ts` | one card per article |
| `src/pages/og/vs/[slug].png.ts` | comparison cards — only the indexable batch (both tools rated) |
| `src/pages/og/category/[slug].png.ts` | one card per `TOOL_CATEGORIES` entry |
| `src/pages/og/news/[date].png.ts` | one card per `src/data/news/*.json` snapshot |
| `src/pages/og/default.png.ts` | site-wide fallback |

## Emitting the meta tags

Use the helper so paths stay in one place:

```astro
---
import { ogUrlAbsolute, OG_IMAGE_SIZE } from '../og/url';
const image = ogUrlAbsolute('tool', tool.id); // https://getaibriefs.com/og/tools/<slug>.png
---
<meta property="og:image" content={image} />
<meta property="og:image:width" content={String(OG_IMAGE_SIZE.width)} />
<meta property="og:image:height" content={String(OG_IMAGE_SIZE.height)} />
<meta property="og:image:type" content="image/png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={image} />
```

Kinds and the URLs they map to:

| `ogUrl(kind, slug)` | Path |
| --- | --- |
| `('tool', 'chatgpt')` | `/og/tools/chatgpt.png` |
| `('article', 'best-ai-chatbots')` (alias `'blog'`) | `/og/blog/best-ai-chatbots.png` |
| `('vs', 'claude-vs-chatgpt')` | `/og/vs/claude-vs-chatgpt.png` |
| `('category', 'ai-writing')` | `/og/category/ai-writing.png` |
| `('news', '2026-09-02')` | `/og/news/2026-09-02.png` |
| `('site')` | `/og/default.png` |

Comparison pages outside the rated batch have no card; fall back to
`ogUrl('category', toolA.data.category)` or `ogUrl('site')` for those.

## `renderOg` options

```ts
renderOg({
  kind: 'tool' | 'article' | 'vs' | 'category' | 'news' | 'quiz' | 'site',
  title: string,        // wrap one word in *asterisks* for a serif-italic orange accent
  subtitle?: string,
  eyebrow?: string,     // small uppercase label next to the signal bar
  logo?: string,        // absolute path to a PNG (tool / quiz); lettermark fallback
  screenshot?: string,  // absolute path to a 1200×630 JPG (tool / quiz); glow fallback
  rating?: number,      // 1–5, drawn as stars
  pricing?: 'free' | 'freemium' | 'paid',
  left?: { name, logo? }, right?: { name, logo? },  // vs
  headlines?: string[], // news: top three listed under the title
}) => Promise<Buffer>   // PNG
```

Helpers `toolLogoPath(slug)` and `toolScreenshotPath(slug)` resolve
`public/logos/<slug>.png` and `public/tools/<slug>.jpg`, returning `undefined`
when the file is missing so the card degrades gracefully.

### Variants

- **tool** – logo tile (or lettermark), name, one-line description in
  Instrument Serif Italic, pricing pill and star rating; the product screenshot
  sits in a −4° tilted window on the right. No screenshot → large orange glow.
- **article** – category eyebrow, big title (max 3 lines), `reading time · date`.
- **vs** – two logos/lettermarks around a large serif-italic *vs*, names below.
- **category** – category name at up to 136px, `N tools, compared`.
- **news** – `Daily brief · <date>`, `N stories that *mattered*`, top-3 headlines.
- **quiz** – tool layout with eyebrow `My AI tool match` and subtitle `Matched for <goal>`
  in orange. There is no endpoint yet: quiz results are chosen client-side, so
  the share flow needs either one card per tool (`/og/quiz/<slug>.png`, add a
  `src/pages/og/quiz/[slug].png.ts` mirroring the tools endpoint) or per
  tool × goal (7 goals in `src/pages/tools/quiz.astro`).
- **site** – default card.

## Brand tokens ("Ink & Signal")

ink `#0a0a0b` · text `#f5f5f4` · muted `#8f8f97` · signal `#ff6a35` ·
hairline `rgba(255,255,255,0.10)`. Inter SemiBold titles at −0.03em tracking,
Instrument Serif Italic for the accent word / subtitle, uppercase Inter Medium
labels at 0.12em. 72px padding, 48px grid at 6%, signal bar top-left, wordmark
bottom-left, `getaibriefs.com` bottom-right. Title size: 72px ≤ 40 chars,
60px ≤ 70, 50px otherwise (thresholds scale with column width).

## Disk cache

Finished PNGs are cached in `node_modules/.cache/aib-og/<sha1>.png`. The key
is the SHA-1 of `JSON.stringify(opts)` (asset paths made relative to the
project root) plus **content hashes** of the screenshot, the logo(s) and
`src/og/render.ts` itself. Content hashes rather than mtimes because a git
checkout resets every mtime — an mtime-keyed cache would miss on every Vercel
build, which restores `node_modules/.cache` precisely so this kind of cache
survives.

- Hit → the file bytes are returned; nothing is rendered.
- Miss → render, then write-and-rename into the cache (a killed build never
  leaves a truncated card behind).
- Editing `render.ts`, a screenshot, a logo, or any option invalidates only
  the affected cards.
- `AIB_OG_NO_CACHE=1 npm run build` bypasses the cache; `clearOgCache()` (or
  `rm -rf node_modules/.cache/aib-og`) empties it.
- The build log ends with `[og] share cards: N from cache, M rendered`.

## Build cost

420 cards per build (222 tools, 31 articles, 11 comparisons, 21 categories,
134 news days, 1 default), ~87 MB of PNGs, median 160 KB each. Measured on a
2-vCPU box against a 48 s baseline without cards:

| | build | per card |
| --- | --- | --- |
| cold (empty cache) | 2 min 25 s | avg 190 ms — 124 ms text-only, 248 ms with screenshot, max 421 ms |
| warm (cache hit) | 57 s | ~2 ms (file read) |

How it stays cheap:

- satori converts CSS gradients into SVG `<pattern>`s and `box-shadow` into
  blur filters, and resvg renders those slowly (0.8 s and 6 s per card in
  testing). So the backdrop — grid, vignette, glows, the screenshot window's
  shadow — is a hand-written SVG rasterised **once** per configuration and
  cached as raw RGBA; nothing in the satori tree uses gradients or shadows.
- resvg also decodes embedded rasters slowly, so the backdrop never passes
  through it: the foreground renders on a transparent canvas and `sharp`
  composites it over the cached backdrop, then encodes the PNG.
- Fonts load once; screenshots are pre-resized to 640 px and logos to 192 px
  and cached as data URIs in memory.
- Text is sanitised to glyphs the bundled fonts cover (emoji, non-Latin
  scripts and stray combining marks in headlines are dropped, not drawn as
  tofu).

Logo tiles: a transparent logo whose visible pixels are dark gets a white
tile, a light one gets an ink tile; opaque logos are shown full-bleed with
rounded corners.

To preview a card without a full build:

```sh
export PATH=/root/.cache/node/bin:$PATH
node --experimental-strip-types -e "
import('./src/og/render.ts').then(async ({ renderOg }) => {
  const { writeFileSync } = await import('node:fs');
  writeFileSync('/tmp/card.png', await renderOg({ kind: 'site', title: 'Hello, *world*' }));
});"
```
