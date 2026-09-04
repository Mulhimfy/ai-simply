/**
 * Briefs + news snapshots — build-time helpers shared by the home page, `/news/`
 * and `/news/[date]/`. Everything runs over committed files (`src/data/news/*.json`
 * raw RSS snapshots, `src/data/briefs/*.json` editorial briefs) — no network, no DOM.
 *
 *   const { briefs, latest, tools, dates } = await loadBriefs();   // cached per build
 *   restOfDay(brief, snapshotFor(brief.date))   // raw stories the brief didn't use
 *   topOfWeek(briefs, 3)                        // deduped across the last 7 briefs
 *   archive(briefs, 30)                         // heat strip + month groups
 *
 * The data model itself (Brief, BriefItem, ANGLES, allBriefs …) lives in `./brief`.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { keywords } from '../utils/news.mjs';
import { allBriefs, ANGLES, type Angle, type Brief, type BriefItem, type EditorialBrief, type ToolLite } from './brief';

export type { Brief, BriefItem, Angle } from './brief';

export interface NewsItem {
	title: string;
	link: string;
	date: string;
	source: string;
}
export interface Snapshot {
	/** YYYY-MM-DD — always the file name, which is also the route slug */
	date: string;
	fetchedAt?: string;
	items: NewsItem[];
}

/** The fields `ToolCard` needs, keyed by slug — what `BriefItems` renders "What to try" from. */
export interface ToolMini {
	slug: string;
	name: string;
	description: string;
	category: string;
	subcategory?: string;
	pricing: 'free' | 'freemium' | 'paid';
	rating?: number;
	ratingCount?: number;
	verified?: boolean;
}
export type ToolMap = Map<string, ToolMini>;

/* ── snapshots ───────────────────────────────────────────────────────────── */

const snapshotModules = import.meta.glob<Snapshot>('../data/news/*.json', { eager: true, import: 'default' });
const editorialModules = import.meta.glob<EditorialBrief>('../data/briefs/*.json', { eager: true, import: 'default' });

const slugOf = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');

/** Every raw snapshot, newest first. The file name is the canonical date. */
export const SNAPSHOTS: Snapshot[] = Object.entries(snapshotModules)
	.map(([path, data]) => ({ date: slugOf(path), fetchedAt: data.fetchedAt, items: Array.isArray(data.items) ? data.items : [] }))
	.sort((a, b) => b.date.localeCompare(a.date));

export function snapshotFor(date: string): Snapshot | undefined {
	return SNAPSHOTS.find((s) => s.date === date);
}

/* ── briefs ──────────────────────────────────────────────────────────────── */

export interface BriefData {
	/** newest first; editorial briefs override auto briefs for the same day */
	briefs: Brief[];
	/** the same order, dates only — handy for prev/next */
	dates: string[];
	latest: Brief | undefined;
	tools: ToolMap;
}

type ToolEntry = CollectionEntry<'tools'>;

export function toolsLite(entries: ToolEntry[]): ToolLite[] {
	return entries.map((t) => ({
		slug: t.id,
		name: t.data.name,
		tags: t.data.tags,
		category: t.data.category,
		description: t.data.description,
		rating: t.data.rating,
	}));
}

export function toolMap(entries: ToolEntry[]): ToolMap {
	return new Map(
		entries.map((t) => [
			t.id,
			{
				slug: t.id,
				name: t.data.name,
				description: t.data.description,
				category: t.data.category,
				subcategory: t.data.subcategory,
				pricing: t.data.pricing,
				rating: t.data.rating,
				ratingCount: t.data.ratingCount,
				verified: t.data.verified,
			},
		]),
	);
}

let cache: Promise<BriefData> | undefined;

/** All briefs (editorial + automatic), with the tools they reference. Cached for the build. */
export function loadBriefs(): Promise<BriefData> {
	return (cache ??= (async () => {
		const entries = await getCollection('tools');
		const briefs = allBriefs(snapshotModules, editorialModules, toolsLite(entries));
		return { briefs, dates: briefs.map((b) => b.date), latest: briefs[0], tools: toolMap(entries) };
	})());
}

/** Older and newer *existing* dates around `date` in a newest-first list (null at the edges). */
export function neighbours(dates: string[], date: string): { prev: string | null; next: string | null } {
	const i = dates.indexOf(date);
	if (i < 0) return { prev: null, next: null };
	return { prev: dates[i + 1] ?? null, next: dates[i - 1] ?? null };
}

/** Up to `n` existing dates either side of `date`, oldest → newest, excluding `date`. */
export function nearbyDates(dates: string[], date: string, n = 3): string[] {
	const i = dates.indexOf(date);
	if (i < 0) return [];
	const newer = dates.slice(Math.max(0, i - n), i);
	const older = dates.slice(i + 1, i + 1 + n);
	return [...older.reverse(), ...newer];
}

/** Items per angle — feeds the counts on `AngleChips`. */
export function angleCounts(brief: Brief): Partial<Record<Angle, number>> {
	const out: Partial<Record<Angle, number>> = {};
	for (const it of brief.items) out[it.angle] = (out[it.angle] ?? 0) + 1;
	return out;
}

/** Angles present in a brief, in the canonical ANGLES order. */
export function briefAngles(brief: Brief): Angle[] {
	const present = new Set(brief.items.map((i) => i.angle));
	return (Object.keys(ANGLES) as Angle[]).filter((a) => present.has(a));
}

/** One-tap share copy, written for a friend. */
export function shareText(brief: Brief): string {
	return `The 3-minute AI brief for ${dateParts(brief.date).weekdayMonthDay}: ${brief.title}`;
}

/** Meta description: the editorial lede, else the first headlines. */
export function briefDescription(brief: Brief, max = 160): string {
	const raw = brief.intro?.trim() || brief.items.map((i) => i.headline.replace(/[.!?]$/, '')).join('. ') + '.';
	return raw.length > max ? raw.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : raw;
}

/* ── dates ───────────────────────────────────────────────────────────────── */

export interface DateParts {
	iso: string;
	weekday: string;
	weekdayShort: string;
	month: string;
	monthShort: string;
	day: number;
	year: number;
	/** "Wednesday, September 2, 2026" */
	long: string;
	/** "Wednesday, September 2" */
	weekdayMonthDay: string;
	/** "September 2, 2026" */
	monthDayYear: string;
	/** "Sep 2" */
	short: string;
	/** "Wed, Sep 2" */
	shortWeekday: string;
	dateObj: Date;
}

/** Labels for a YYYY-MM-DD slug. Everything is UTC so builds are deterministic. */
export function dateParts(iso: string): DateParts {
	const d = new Date(iso + 'T00:00:00Z');
	const f = (opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
	return {
		iso,
		weekday: f({ weekday: 'long' }),
		weekdayShort: f({ weekday: 'short' }),
		month: f({ month: 'long' }),
		monthShort: f({ month: 'short' }),
		day: d.getUTCDate(),
		year: d.getUTCFullYear(),
		long: f({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
		weekdayMonthDay: f({ weekday: 'long', month: 'long', day: 'numeric' }),
		monthDayYear: f({ month: 'long', day: 'numeric', year: 'numeric' }),
		short: f({ month: 'short', day: 'numeric' }),
		shortWeekday: f({ weekday: 'short', month: 'short', day: 'numeric' }),
		dateObj: d,
	};
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** "11:55 UTC" from an ISO/RFC-822 string, or null when unparseable. */
export function clockUTC(date?: string): string | null {
	if (!date) return null;
	const d = new Date(date);
	if (isNaN(d.getTime())) return null;
	return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

/* ── raw stories (NewsTimeline) ──────────────────────────────────────────── */

/** A raw story with its timestamp parsed and labels derived, ready to render. */
export interface Story extends NewsItem {
	/** ISO timestamp, or '' when the feed date could not be parsed */
	iso: string;
	/** ms epoch, 0 when unknown */
	ts: number;
	/** "22:08" (UTC), or '—' */
	clock: string;
	/** "Sep 1" (UTC), or '' */
	dayLabel: string;
	/** "2026-09-01" (UTC), or '' */
	dayKey: string;
	/** hostname without www., or '' */
	host: string;
	/** the hostname, only when it says more than `source` (e.g. technologyreview.com for MIT Tech Review) */
	hostLabel: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function hostOf(link: string): string {
	try {
		return new URL(link).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

/** Parse one feed item. Feed dates arrive as RFC-822 or ISO-8601; `Date` handles both. */
export function toStory(item: NewsItem): Story {
	const d = new Date(item.date);
	const ok = !isNaN(d.getTime());
	const host = hostOf(item.link);
	const hostLabel = host && norm(host.replace(/\.[a-z]+$/i, '')) !== norm(item.source) ? host : '';
	return {
		...item,
		title: item.title.trim(),
		iso: ok ? d.toISOString() : '',
		ts: ok ? d.getTime() : 0,
		clock: ok ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '—',
		dayLabel: ok ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '',
		dayKey: ok ? isoDay(d) : '',
		host,
		hostLabel,
	};
}

/** Stories newest first; undated items keep their feed order at the end. */
export function toStories(items: NewsItem[]): Story[] {
	return items
		.map((it, i) => ({ s: toStory(it), i }))
		.sort((a, b) => {
			if (a.s.ts && b.s.ts) return b.s.ts - a.s.ts;
			if (a.s.ts) return -1;
			if (b.s.ts) return 1;
			return a.i - b.i;
		})
		.map((x) => x.s);
}

/** Distinct sources, busiest first (then A–Z). Derived from the items — never a hardcoded list. */
export function sourcesOf(items: { source: string }[]): { name: string; count: number }[] {
	const m = new Map<string, number>();
	for (const it of items) m.set(it.source, (m.get(it.source) ?? 0) + 1);
	return [...m]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const canonicalLink = (link: string) => link.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();

/** The snapshot's stories the brief didn't already tell — "Everything else today". */
export function restOfDay(brief: Brief, snapshot: Snapshot | undefined): NewsItem[] {
	if (!snapshot) return [];
	const used = new Set(brief.items.flatMap((i) => i.sources.map((s) => canonicalLink(s.link))));
	const headlines = brief.items.map((i) => keywords(i.headline));
	return snapshot.items.filter((it) => {
		if (used.has(canonicalLink(it.link))) return false;
		const k = keywords(it.title);
		return !headlines.some((h) => sameStory(h, k));
	});
}

/* ── top of the week ─────────────────────────────────────────────────────── */

function overlap(a: Set<string>, b: Set<string>): { shared: number; jaccard: number } {
	if (!a.size || !b.size) return { shared: 0, jaccard: 0 };
	let shared = 0;
	for (const w of a) if (b.has(w)) shared++;
	return { shared, jaccard: shared / (a.size + b.size - shared) };
}

/** Same story, different headline: news.mjs's 0.4 Jaccard, or ≥3 shared keywords with a looser ratio. */
function sameStory(a: Set<string>, b: Set<string>): boolean {
	const { shared, jaccard } = overlap(a, b);
	return jaccard >= 0.4 || (shared >= 3 && jaccard >= 0.25);
}

export interface WeekPick {
	item: BriefItem;
	/** the brief it appeared in */
	date: string;
	/** distinct outlets across every version of the story this week */
	coverage: number;
}

/**
 * The stories that kept coming up across the last 7 briefs: dedupe items by
 * `keywords()` overlap on the headline, merge their outlets, rank by coverage,
 * then editorial copy, then recency. Pass `exclude` (usually today's brief) to
 * drop anything the reader has just read.
 */
export function topOfWeek(briefs: Brief[], limit = 3, exclude?: Brief): WeekPick[] {
	type P = { item: BriefItem; date: string; ks: Set<string>; outlets: Set<string> };
	const skip = (exclude?.items ?? []).map((i) => keywords(i.headline));
	const picks: P[] = [];
	for (const b of briefs.slice(0, 7)) {
		for (const item of b.items) {
			const ks = keywords(item.headline);
			if (skip.some((k) => sameStory(k, ks))) continue;
			const outlets = new Set(item.sources.map((s) => s.source));
			const dup = picks.find((p) => sameStory(p.ks, ks));
			if (dup) {
				outlets.forEach((o) => dup.outlets.add(o));
				// keep the version with real copy
				if (!dup.item.why && item.why) Object.assign(dup, { item, date: b.date });
				continue;
			}
			picks.push({ item, date: b.date, ks, outlets });
		}
	}
	picks.sort((a, b) => b.outlets.size - a.outlets.size || Number(!!b.item.why) - Number(!!a.item.why) || b.date.localeCompare(a.date));
	return picks.slice(0, limit).map((p) => ({ item: p.item, date: p.date, coverage: p.outlets.size }));
}

/* ── archive ─────────────────────────────────────────────────────────────── */

export interface HeatCell {
	date: string;
	count: number;
	/** 0–1 relative to the busiest day in the window; 0 when there is no brief */
	heat: number;
	label: string;
	href: string | null;
}
export interface MonthGroup {
	key: string;
	/** "August 2026" */
	label: string;
	briefs: Brief[];
}
export interface Archive {
	/** the last `heatDays` calendar days ending on the newest brief; missing days stay as empty cells */
	heat: HeatCell[];
	heatStart: string;
	heatEnd: string;
	/** every brief except the newest, newest month first, newest day first within a month */
	months: MonthGroup[];
	total: number;
	first: string | null;
}

export function archive(briefs: Brief[], heatDays = 30): Archive {
	const newest = briefs[0];
	if (!newest) return { heat: [], heatStart: '', heatEnd: '', months: [], total: 0, first: null };
	const byDate = new Map(briefs.map((b) => [b.date, b]));

	const end = new Date(newest.date + 'T00:00:00Z');
	const cells: HeatCell[] = [];
	for (let i = heatDays - 1; i >= 0; i--) {
		const d = new Date(end);
		d.setUTCDate(end.getUTCDate() - i);
		const date = isoDay(d);
		const b = byDate.get(date);
		const count = b ? Math.max(b.storyCount, b.items.length) : 0;
		cells.push({ date, count, heat: 0, label: dateParts(date).shortWeekday, href: b ? `/news/${date}/` : null });
	}
	const max = Math.max(1, ...cells.map((c) => c.count));
	for (const c of cells) c.heat = c.count ? Math.max(0.25, c.count / max) : 0;

	const groups = new Map<string, MonthGroup>();
	for (const b of briefs.slice(1)) {
		const key = b.date.slice(0, 7);
		const p = dateParts(b.date);
		let g = groups.get(key);
		if (!g) {
			g = { key, label: `${p.month} ${p.year}`, briefs: [] };
			groups.set(key, g);
		}
		g.briefs.push(b);
	}

	return {
		heat: cells,
		heatStart: cells[0].date,
		heatEnd: cells[cells.length - 1].date,
		months: [...groups.values()],
		total: briefs.length,
		first: briefs[briefs.length - 1]?.date ?? null,
	};
}


/* ── explainers that match the brief ────────────────────────────────────── */

/** The minimum an explainer needs to be ranked and rendered as an `ArticleCard`. */
export interface PostLike {
	id: string;
	data: { title: string; description: string; tags?: string[]; pubDate: Date };
}

/**
 * Explainers worth reading after today's brief: score each post by keyword overlap
 * with the brief's headlines (title counts double, tags count once), then fill the
 * remaining slots with the newest posts. Deterministic, no network, never empty.
 */
export function relatedExplainers<T extends PostLike>(brief: Brief, posts: T[], limit = 3): T[] {
	const newest = [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
	const briefWords = new Set<string>();
	for (const it of brief.items) for (const w of keywords(it.headline)) briefWords.add(w);

	const scored = newest
		.map((p) => {
			const title = keywords(p.data.title);
			const rest = new Set([...keywords(p.data.description), ...(p.data.tags ?? []).flatMap((t) => [...keywords(t)])]);
			let score = 0;
			for (const w of title) if (briefWords.has(w)) score += 2;
			for (const w of rest) if (briefWords.has(w) && !title.has(w)) score += 1;
			return { p, score };
		})
		.filter((x) => x.score > 0)
		.sort((a, b) => b.score - a.score || b.p.data.pubDate.valueOf() - a.p.data.pubDate.valueOf());

	const out: T[] = [];
	const seen = new Set<string>();
	for (const { p } of scored) {
		if (out.length >= limit) break;
		if (seen.has(p.id)) continue;
		seen.add(p.id);
		out.push(p);
	}
	for (const p of newest) {
		if (out.length >= limit) break;
		if (seen.has(p.id)) continue;
		seen.add(p.id);
		out.push(p);
	}
	return out;
}
