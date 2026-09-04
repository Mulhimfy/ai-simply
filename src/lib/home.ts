/**
 * Homepage helpers.
 *  - latestSnapshot(): newest committed news snapshot (never a live fetch at build)
 *  - toolOfTheDay(): deterministic pick from rated tools by day-of-year
 *  - newToolsBucket(): honest "new" count — widens the window until it finds something
 *  - comparisonCount(): number of indexable head-to-heads (both tools rated, same subcategory)
 */

export interface NewsItem { title: string; link: string; date: string; source: string }
export interface Snapshot { date: string; fetchedAt?: string; items: NewsItem[] }
export type Headline = NewsItem & { iso: string | null };

const snapshots = import.meta.glob<Snapshot | { default: Snapshot }>('../data/news/*.json', { eager: true });

/** Newest snapshot by filename (YYYY-MM-DD sorts lexicographically). Null when none exist. */
export function latestSnapshot(): { slug: string; data: Snapshot } | null {
	const entries = Object.entries(snapshots)
		.map(([path, mod]) => {
			const data = ((mod as { default?: Snapshot }).default ?? mod) as Snapshot;
			return { slug: path.split('/').pop()!.replace(/\.json$/, ''), data };
		})
		.filter((e) => Array.isArray(e.data?.items) && e.data.items.length > 0)
		.sort((a, b) => b.slug.localeCompare(a.slug));
	return entries[0] ?? null;
}

/** Feed dates come as RFC 2822 or ISO 8601; both parse natively. */
export function parseNewsDate(s: string | undefined): Date | null {
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Top N headlines, newest first, with a normalised ISO timestamp for <time>. */
export function topHeadlines(snap: Snapshot, n = 5): Headline[] {
	return snap.items
		.map((it) => ({ ...it, iso: parseNewsDate(it.date)?.toISOString() ?? null }))
		.sort((a, b) => (b.iso ?? '').localeCompare(a.iso ?? ''))
		.slice(0, n);
}

/** Server-side fallback for <time data-relative>; the client rewrites it live. */
export function relativeLabel(iso: string | null, now = Date.now()): string {
	if (!iso) return '';
	const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return `${Math.floor(s / 60)}m ago`;
	if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
	if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function dayOfYear(d = new Date()): number {
	const start = Date.UTC(d.getUTCFullYear(), 0, 0);
	return Math.floor((d.getTime() - start) / 864e5);
}

/** Same tool for everyone on a given day; rotates through every rated tool over the year. */
export function toolOfTheDay<T extends { id: string; data: { rating?: number } }>(tools: T[], date = new Date()): T | null {
	const rated = tools.filter((t) => typeof t.data.rating === 'number').sort((a, b) => a.id.localeCompare(b.id));
	if (!rated.length) return null;
	return rated[dayOfYear(date) % rated.length];
}

const BUCKETS = [
	[7, 'New this week'],
	[30, 'New this month'],
	[90, 'New this quarter'],
	[365, 'New this year'],
] as const;

/** First time window that actually contains new tools — never shows a fake zero. */
export function newToolsBucket<T extends { data: { pubDate: Date } }>(tools: T[], now = Date.now()) {
	for (const [days, label] of BUCKETS) {
		const count = tools.filter((t) => now - t.data.pubDate.valueOf() <= days * 864e5).length;
		if (count > 0) return { label, count, days };
	}
	return { label: 'Newest tools', count: Math.min(8, tools.length), days: 0 };
}

/** Pairs of rated tools sharing a subcategory (or category when unset) — mirrors the vs-page index gate. */
export function comparisonCount<T extends { data: { rating?: number; category: string; subcategory?: string } }>(tools: T[]): number {
	const groups = new Map<string, number>();
	for (const t of tools) {
		if (typeof t.data.rating !== 'number') continue;
		const key = t.data.subcategory ?? `cat:${t.data.category}`;
		groups.set(key, (groups.get(key) ?? 0) + 1);
	}
	let pairs = 0;
	for (const n of groups.values()) pairs += (n * (n - 1)) / 2;
	return pairs;
}
