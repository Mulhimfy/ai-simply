# The daily brief

The brief is the product. Everything here describes how one gets made, published and edited.

## Two kinds of brief

**Editorial** — `src/data/briefs/<date>.json`. Hand-written or model-written, then reviewed. Carries
the real value: a title, a lede, and for each story a plain-English "why it matters", a suggested
action, an angle, and tools worth trying.

**Automatic** — derived at build time from the raw feed snapshot in `src/data/news/<date>.json` when
no editorial file exists for that day. It clusters headlines that cover the same event, tags each
with an angle, counts how many outlets covered it, and matches tools by name and tag.

An automatic brief has **no commentary**, and the UI must never invent any: it shows the headline,
the angle, the outlets and the matched tools, and nothing else. Editorial always wins for a date
that has both.

Both are produced by `allBriefs()` in `src/lib/brief.ts`, which every page uses:

```ts
import { allBriefs } from '../lib/brief';
const briefs = allBriefs(
  import.meta.glob('../data/news/*.json', { eager: true, import: 'default' }),
  import.meta.glob('../data/briefs/*.json', { eager: true, import: 'default' }),
  toolsLite,
);
```

## The shape of an editorial brief

```jsonc
{
  "date": "2026-09-02",
  "title": "One line naming the two or three things that actually happened",
  "intro": "One or two sentences framing the day.",
  "items": [
    {
      "headline": "Rewritten in plain English, under 90 characters",
      "why": "Two sentences: what changed, and why it matters to a normal person.",
      "action": "One sentence: what to do, try, or watch. Optional.",
      "angle": "policy",              // work | money | creators | builders | everyday | policy | science
      "tools": ["chatgpt"],           // 0–2 slugs that must exist in src/content/tools/
      "sources": [                     // verbatim from the snapshot — never invented
        { "title": "…", "link": "https://…", "source": "Wired", "date": "2026-09-01T10:00:00Z" }
      ]
    }
  ]
}
```

Rules that the generator enforces and a human editor must respect:

- Five or six items. Fewer reads thin; more breaks the three-minute promise.
- Every `link` must appear in that day's snapshot. Sources are cited, not invented.
- Every tool slug must exist. Two at most per item.
- No hype, sentence case, plain English. See §7 "Copy integrity" in `docs/REBUILD.md`.

## Generating one

```sh
npm run write-brief                      # newest snapshot that has no brief yet
npm run write-brief -- --date 2026-09-01 # a specific day
npm run write-brief -- --force           # overwrite an existing brief
npm run write-brief -- --dry-run         # print the prompt and schema, call nothing
```

The script reads the snapshot, pre-clusters the headlines, and asks the Claude API for a validated
`EditorialBrief`. It validates the response itself — angles, source URLs against the snapshot, tool
slugs against the collection, item count and string lengths — and retries once with the errors fed
back before giving up.

Without `ANTHROPIC_API_KEY` it prints a notice and exits 0. Nothing in the build depends on it, so a
missing key degrades that day to an automatic brief rather than breaking the site.

## Editing by hand

**Never type a URL.** Write the brief with only the source *titles* filled in, leaving `link`,
`source` and `date` as empty strings, then run:

```sh
npm run link-brief -- 2026-09-02     # resolve one day against its snapshot
npm run link-brief -- --all          # check and repair every brief
npm run link-brief -- --all --check  # report only; exits 1 on a problem
```

It matches each title against that day's snapshot and fills in the real link, outlet and timestamp.
Anything it cannot match is reported and dropped rather than published. `npm run verify` fails the
build if a brief ever cites a link that is not in its snapshot, so an invented citation cannot ship.


Open `src/data/briefs/<date>.json` and edit it like prose. There is no build step: the page reads
the JSON directly, so `npm run dev` shows the change immediately. Reordering items reorders the
brief. Deleting the file falls back to the automatic brief for that day.

To write a brief for a day with no snapshot, create the snapshot first
(`node scripts/fetch-news.mjs`) or add the sources by hand.

## In CI

`.github/workflows/daily-news.yml` runs daily: fetch the feeds, write the brief, commit both
`src/data/news/` and `src/data/briefs/`. It needs one repository secret:

**Settings → Secrets and variables → Actions → New repository secret**
`ANTHROPIC_API_KEY` = an API key from console.anthropic.com.

If the key is absent or the call fails, the workflow still commits the snapshot and the site falls
back to an automatic brief for that day.

## Where a brief shows up

| Surface | What it uses |
| --- | --- |
| `/` | The newest brief, in full |
| `/news/` | The archive: newest brief summarised, then every past day |
| `/news/<date>/` | One brief, with prev/next day navigation |
| `/rss.xml` | Every brief as a feed item, newest first, alongside the explainers |
| `/og/news/<date>.png` | The share card: brief title plus its top three headlines |
| Tool pages | An "In the brief" block when that tool appears in any brief's `tools` |
