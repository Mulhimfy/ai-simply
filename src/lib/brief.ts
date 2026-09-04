/**
 * The Brief — the product's core data model.
 *
 * A brief is one day's 3-minute read: a handful of stories that changed something,
 * each with an angle (who it affects), why it matters, and what to try.
 *
 * Two layers:
 *   1. Editorial briefs in `src/data/briefs/YYYY-MM-DD.json` (written by an editor or by
 *      `scripts/write-brief.mjs` in CI). These carry real "why it matters" copy.
 *   2. A deterministic fallback derived from the raw RSS snapshot in `src/data/news/`
 *      (clusters headlines across sources, tags an angle, matches tools) so every day
 *      has a brief even when no editorial file exists.
 */
import { keywords } from '../utils/news.mjs';

export type Angle = 'work' | 'money' | 'creators' | 'builders' | 'everyday' | 'policy' | 'science';

export interface BriefSource { title: string; link: string; source: string; date: string }

export interface BriefItem {
	/** stable id within the day (slug of the headline) */
	id: string;
	headline: string;
	/** one or two plain-English sentences: what changed and why it matters. Empty in fallback. */
	why: string;
	/** optional one-line "what to do / what to try" */
	action?: string;
	angle: Angle;
	/** tool slugs worth trying in this context (resolved against the tools collection) */
	tools: string[];
	sources: BriefSource[];
	/** number of distinct outlets covering the story */
	coverage: number;
}

export interface Brief {
	date: string; // YYYY-MM-DD
	title: string; // e.g. "Google courts Hollywood, Pangram sets the AI-detection bar"
	intro?: string; // editorial 1–2 sentence lede
	items: BriefItem[];
	readingMinutes: number;
	/** 'editorial' when from src/data/briefs, 'auto' when derived */
	kind: 'editorial' | 'auto';
	sourceCount: number;
	storyCount: number; // stories in the raw snapshot
}

export const ANGLES: Record<Angle, { name: string; blurb: string; icon: string }> = {
	work:     { name: 'Your work',     blurb: 'Jobs, skills and the office', icon: 'briefcase' },
	money:    { name: 'Money',         blurb: 'Deals, funding, pricing, markets', icon: 'badge-dollar-sign' },
	creators: { name: 'Creators',      blurb: 'Writing, images, video, music', icon: 'palette' },
	builders: { name: 'Builders',      blurb: 'Models, APIs, developer tools', icon: 'code-2' },
	everyday: { name: 'Everyday life', blurb: 'Phones, homes, health, learning', icon: 'sparkles' },
	policy:   { name: 'Rules & power', blurb: 'Regulation, safety, big tech', icon: 'scale' },
	science:  { name: 'Research',      blurb: 'Papers, breakthroughs, benchmarks', icon: 'flask-conical' },
};

const ANGLE_HINTS: Record<Angle, string[]> = {
	work:     ['job', 'jobs', 'hiring', 'layoff', 'layoffs', 'worker', 'workers', 'office', 'productivity', 'employee', 'employees', 'career', 'skills', 'workplace', 'enterprise', 'agent', 'agents', 'copilot'],
	money:    ['funding', 'raises', 'raised', 'valuation', 'unicorn', 'ipo', 'revenue', 'billion', 'million', 'acquire', 'acquires', 'acquisition', 'deal', 'price', 'pricing', 'subscription', 'stock', 'shares', 'investors', 'startup', 'startups'],
	creators: ['image', 'images', 'video', 'videos', 'music', 'film', 'hollywood', 'studio', 'studios', 'artists', 'artist', 'writing', 'writers', 'creative', 'photo', 'photos', 'design', 'voice', 'podcast', 'youtube', 'tiktok', 'deepfake', 'deepfakes'],
	builders: ['model', 'models', 'open', 'source', 'api', 'developer', 'developers', 'code', 'coding', 'github', 'llm', 'gpu', 'gpus', 'chip', 'chips', 'nvidia', 'inference', 'training', 'benchmark', 'hugging', 'weights', 'llama', 'gemini', 'claude', 'gpt'],
	everyday: ['phone', 'iphone', 'android', 'home', 'car', 'cars', 'health', 'doctor', 'kids', 'school', 'students', 'teacher', 'teachers', 'learning', 'shopping', 'search', 'browser', 'assistant', 'siri', 'alexa', 'glasses', 'wearable', 'consumer', 'users', 'app', 'apps'],
	policy:   ['regulation', 'regulators', 'law', 'laws', 'lawsuit', 'sues', 'sued', 'court', 'ban', 'bans', 'government', 'senate', 'congress', 'eu', 'uk', 'china', 'safety', 'privacy', 'copyright', 'antitrust', 'ftc', 'election', 'military', 'pentagon', 'surveillance', 'policy'],
	science:  ['research', 'researchers', 'study', 'paper', 'scientists', 'science', 'breakthrough', 'discovery', 'physics', 'biology', 'protein', 'drug', 'medicine', 'quantum', 'robot', 'robots', 'robotics', 'brain', 'neural'],
};

export interface SnapshotItem { title: string; link: string; date: string; source: string }
export interface Snapshot { date: string; fetchedAt?: string; items: SnapshotItem[] }
export interface EditorialBrief {
	date: string; title: string; intro?: string;
	items: { headline: string; why: string; action?: string; angle: Angle; tools?: string[]; sources: BriefSource[] }[];
}
export interface ToolLite { slug: string; name: string; tags: string[]; category: string; description: string; rating?: number }

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export function angleFor(title: string): Angle {
	const kw = keywords(title) as Set<string>;
	const words = new Set([...kw, ...title.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)]);
	let best: Angle = 'everyday';
	let bestScore = 0;
	for (const [angle, hints] of Object.entries(ANGLE_HINTS) as [Angle, string[]][]) {
		let s = 0;
		for (const h of hints) if (words.has(h)) s++;
		if (s > bestScore) { bestScore = s; best = angle; }
	}
	return best;
}

/** Cluster a day's headlines by keyword overlap (Jaccard ≥ 0.34 or ≥ 3 shared keywords). */
export function cluster(items: SnapshotItem[]): SnapshotItem[][] {
	const kws = items.map((i) => keywords(i.title) as Set<string>);
	const groups: number[][] = [];
	const assigned = new Array(items.length).fill(-1);
	for (let i = 0; i < items.length; i++) {
		if (assigned[i] >= 0) continue;
		const g = [i]; assigned[i] = groups.length;
		for (let j = i + 1; j < items.length; j++) {
			if (assigned[j] >= 0) continue;
			let shared = 0;
			for (const k of kws[i]) if (kws[j].has(k)) shared++;
			const union = kws[i].size + kws[j].size - shared;
			const jac = union ? shared / union : 0;
			if (jac >= 0.34 || shared >= 3) { g.push(j); assigned[j] = groups.length; }
		}
		groups.push(g);
	}
	return groups.map((g) => g.map((i) => items[i]));
}

/** Match tools to a headline by name / tag overlap. */
export function matchTools(title: string, tools: ToolLite[], max = 2): string[] {
	const t = title.toLowerCase();
	const kw = keywords(title) as Set<string>;
	const scored = tools.map((tool) => {
		let s = 0;
		const name = tool.name.toLowerCase();
		if (name.length > 3 && t.includes(name)) s += 10;
		for (const tag of tool.tags) if (kw.has(tag.toLowerCase())) s += 3;
		if (s && tool.rating) s += tool.rating / 5;
		return { slug: tool.slug, s };
	}).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
	return scored.slice(0, max).map((x) => x.slug);
}

function parseDate(d: string) { const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; }

/** Build the automatic brief for a snapshot. */
export function autoBrief(snapshot: Snapshot, tools: ToolLite[] = [], take = 6): Brief {
	const groups = cluster(snapshot.items)
		.map((g) => ({ g, coverage: new Set(g.map((x) => x.source)).size, newest: Math.max(...g.map((x) => parseDate(x.date))) }))
		.sort((a, b) => b.coverage - a.coverage || b.newest - a.newest);
	const seenAngles = new Map<Angle, number>();
	const items: BriefItem[] = [];
	for (const { g, coverage } of groups) {
		if (items.length >= take) break;
		const lead = g[0];
		const angle = angleFor(lead.title);
		// keep the brief varied: at most 2 per angle
		if ((seenAngles.get(angle) ?? 0) >= 2) continue;
		seenAngles.set(angle, (seenAngles.get(angle) ?? 0) + 1);
		items.push({
			id: slugify(lead.title),
			headline: lead.title,
			why: '',
			angle,
			tools: matchTools(lead.title, tools),
			sources: g.map((x) => ({ title: x.title, link: x.link, source: x.source, date: x.date })),
			coverage,
		});
	}
	const sources = new Set(snapshot.items.map((i) => i.source));
	return {
		date: snapshot.date,
		title: items.slice(0, 2).map((i) => shortHeadline(i.headline)).join(' · '),
		items,
		readingMinutes: Math.max(2, Math.round(items.length * 0.5)),
		kind: 'auto',
		sourceCount: sources.size,
		storyCount: snapshot.items.length,
	};
}

/** Merge an editorial brief with the snapshot (for coverage counts and the "all stories" list). */
export function editorialBrief(ed: EditorialBrief, snapshot: Snapshot | undefined, tools: ToolLite[] = []): Brief {
	const items: BriefItem[] = ed.items.map((it) => ({
		id: slugify(it.headline),
		headline: it.headline,
		why: it.why,
		action: it.action,
		angle: it.angle,
		tools: it.tools?.length ? it.tools : matchTools(it.headline, tools),
		sources: it.sources,
		coverage: new Set(it.sources.map((s) => s.source)).size,
	}));
	const words = items.reduce((n, i) => n + i.why.split(/\s+/).length + i.headline.split(/\s+/).length, 0) + (ed.intro?.split(/\s+/).length ?? 0);
	return {
		date: ed.date,
		title: ed.title,
		intro: ed.intro,
		items,
		readingMinutes: Math.max(2, Math.round(words / 180)),
		kind: 'editorial',
		sourceCount: new Set((snapshot?.items ?? []).map((i) => i.source)).size || new Set(items.flatMap((i) => i.sources.map((s) => s.source))).size,
		storyCount: snapshot?.items.length ?? items.reduce((n, i) => n + i.sources.length, 0),
	};
}

function shortHeadline(h: string, max = 58) {
	let cut = h.split(/[:—–]|\s-\s/)[0].trim();
	if (cut.length > max) {
		// Prefer a clause boundary so the fragment is a whole thought, not a mid-phrase stub.
		const comma = cut.lastIndexOf(',', max);
		cut = comma > 26 ? cut.slice(0, comma) : cut.slice(0, max).replace(/\s+\S*$/, '') + '…';
	}
	// A cut can strand an opening quote ("…alleging a “brazen…"). Drop the orphaned clause
	// rather than print an unbalanced quotation in the day's headline.
	const open = cut.search(/[“‘"]/);
	if (open > -1 && !/[”’"]/.test(cut.slice(open + 1))) {
		cut = cut.slice(0, open).replace(/[\s,;:–—-]+$/, '') + '…';
	}
	return cut;
}

/**
 * Load every day: editorial briefs override auto briefs. Call from pages with the two globs:
 *   const snaps = import.meta.glob('../data/news/*.json', { eager: true })
 *   const eds = import.meta.glob('../data/briefs/*.json', { eager: true })
 */
export function allBriefs(snapshots: Record<string, any>, editorials: Record<string, any>, tools: ToolLite[] = []): Brief[] {
	const byDate = new Map<string, Snapshot>();
	for (const [path, mod] of Object.entries(snapshots)) {
		const snap: Snapshot = (mod as any).default ?? mod;
		const date = snap.date ?? path.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
		if (date) byDate.set(date, { ...snap, date });
	}
	const eds = new Map<string, EditorialBrief>();
	for (const [path, mod] of Object.entries(editorials)) {
		const ed: EditorialBrief = (mod as any).default ?? mod;
		const date = ed.date ?? path.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
		if (date) eds.set(date, { ...ed, date });
	}
	const dates = new Set([...byDate.keys(), ...eds.keys()]);
	return [...dates].sort().reverse().map((date) => {
		const ed = eds.get(date);
		return ed ? editorialBrief(ed, byDate.get(date), tools) : autoBrief(byDate.get(date)!, tools);
	});
}

export const briefUrl = (date: string) => `/news/${date}/`;
export const formatBriefDate = (date: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) =>
	new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
