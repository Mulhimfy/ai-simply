/**
 * Explainers — shared logic for `/blog/*`, `/tutorials/`, `/reviews/` and the article layout.
 *
 * Articles are the *Explainers* section: the depth behind the daily brief. Everything the
 * article surfaces need to agree on (what counts as a tutorial, how a post finds the brief it
 * belongs to, which tools a post mentions) lives here so the pages stay thin.
 *
 * Pure functions. No DOM, no side effects.
 */
import type { CollectionEntry } from 'astro:content';
import { BLOG_CATEGORIES } from '../consts';

export type Post = CollectionEntry<'blog'>;
export type Tool = CollectionEntry<'tools'>;

/* ── categories ──────────────────────────────────────────────────────── */

/**
 * A "tutorial" is a post that teaches you to do or understand something —
 * the how-to guides plus the under-the-hood explainers. Single rule, used by
 * `/tutorials/` and by the "learn next" rails.
 */
export const TUTORIAL_CATEGORIES = ['guides', 'how-ai-works'] as const;

export function isTutorial(post: Post): boolean {
	return (TUTORIAL_CATEGORIES as readonly string[]).includes(post.data.category);
}

export function tutorials(posts: Post[]): Post[] {
	return byNewest(posts.filter(isTutorial));
}

export function byNewest(posts: Post[]): Post[] {
	return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Display name for a blog category slug, with a safe fallback for unknown values. */
export function categoryName(slug: string): string {
	return BLOG_CATEGORIES[slug]?.name ?? slug.replace(/-/g, ' ');
}

export function categoryIcon(slug: string): string {
	return BLOG_CATEGORIES[slug]?.icon ?? 'file-text';
}

/** One-paragraph intro per category — the copy for `/blog/category/<slug>/`. */
export const CATEGORY_INTROS: Record<string, string> = {
	'ai-explained': 'The words everyone uses and nobody defines — models, tokens, agents, hallucinations — in plain English, with the part that actually matters to you.',
	'future-of-work': 'What AI is doing to jobs, teams and careers. Evidence where there is any, honest uncertainty where there is not.',
	'how-ai-works': 'Under the hood without the maths. How these systems are built, why they fail the way they do, and what that means when you use them.',
	'ai-news': 'The stories that changed something, with the context the headlines skip.',
	'comparisons': 'Head-to-head, tested by us. Which one to open first, and when the other one wins.',
	'guides': 'Step-by-step and tested. Open the tool, follow along, get something useful out the other end.',
};

export function categoryIntro(slug: string): string {
	return CATEGORY_INTROS[slug] ?? BLOG_CATEGORIES[slug]?.blurb ?? `Explainers about ${categoryName(slug)}.`;
}

/* ── reading + word count ────────────────────────────────────────────── */

/** Word count over raw markdown, ignoring code fences, link targets and formatting marks. */
export function countWords(markdown: string): number {
	return markdown
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`[^`]+`/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[#*_~>|]/g, '')
		.trim()
		.split(/\s+/)
		.filter((w) => w.length > 0).length;
}

/** `readingTime` is hand-authored per post; fall back to 200wpm when it is missing. */
export function readingLabel(post: Post): string {
	if (post.data.readingTime) return post.data.readingTime;
	return '5 min read';
}

export function readingLabelFor(post: Post, body?: string): string {
	if (post.data.readingTime) return post.data.readingTime;
	if (!body) return '5 min read';
	return `${Math.max(1, Math.round(countWords(body) / 200))} min read`;
}

/* ── ItemList schema for ranked listicles ────────────────────────────── */

export interface ItemListSchema {
	'@context': string;
	'@type': 'ItemList';
	name: string;
	description: string;
	itemListOrder: string;
	numberOfItems: number;
	itemListElement: { '@type': 'ListItem'; position: number; name: string; url?: string }[];
}

/**
 * "Best AI X (Ranked & Reviewed)" posts are numbered lists — `## 1. ChatGPT — …`.
 * Lifting that ranking into ItemList makes the post eligible for Google's list/carousel
 * treatment, and points each entry at our own tool page. Returns null for prose articles,
 * which have no numbered headings. (Ported verbatim in behaviour from the old layout.)
 */
export function buildItemList(markdown: string, opts: { title: string; description: string; siteUrl: string }): ItemListSchema | null {
	const lines = markdown.split(/\r?\n/);
	const items: { position: number; name: string; url?: string }[] = [];

	lines.forEach((line, index) => {
		const heading = line.match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
		if (!heading) return;

		// Strip the "— Best for X" tagline; keep the product name itself.
		const name = heading[2].split(/\s+[—–-]\s+/)[0].trim();
		if (!name) return;

		// First tool link appearing under this heading, before the next one.
		let url: string | undefined;
		for (let i = index + 1; i < lines.length; i++) {
			if (/^##\s/.test(lines[i])) break;
			const link = lines[i].match(/\]\((\/tools\/[a-z0-9-]+\/)\)/);
			if (link) { url = new URL(link[1], opts.siteUrl).href; break; }
		}

		items.push({ position: Number(heading[1]), name, url });
	});

	if (items.length < 2) return null;

	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: opts.title,
		description: opts.description,
		itemListOrder: 'https://schema.org/ItemListOrderDescending',
		numberOfItems: items.length,
		itemListElement: items
			.sort((a, b) => a.position - b.position)
			.map((item) => ({
				'@type': 'ListItem' as const,
				position: item.position,
				name: item.name,
				...(item.url ? { url: item.url } : {}),
			})),
	};
}

/* ── "Tools mentioned" ───────────────────────────────────────────────── */

/**
 * Tool names that are also ordinary English words. Matching these by name alone produces
 * nonsense ("…calm down", "…a bolt of"), so they only count when the article actually links
 * to the tool page.
 */
const COMMON_WORD_NAMES = new Set(['later', 'calm', 'bolt', 'tome', 'mem', 'poe', 'pi', 'v0', 'gamma', 'domo', 'craft', 'motion', 'copy', 'jasper', 'ada']);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Tools a post talks about: whole-word, case-insensitive name matches in the *rendered* HTML,
 * plus anything the post links to at `/tools/<slug>/`. Ordered by first appearance, capped.
 *
 * Two guards keep the list honest:
 *   1. an all-lowercase hit for a capitalised product name is ignored ("the notion that…"),
 *   2. names that are ordinary words (see above) require an explicit link.
 */
export function toolsMentioned(html: string, tools: Tool[], max = 6): Tool[] {
	if (!html) return [];
	const linked = new Set<string>();
	for (const m of html.matchAll(/\/tools\/([a-z0-9-]+)\/?/g)) linked.add(m[1]);

	// Strip tags so attribute values (hrefs, alt text, class names) can't create matches.
	const text = html.replace(/<[^>]*>/g, ' ');

	const hits: { tool: Tool; at: number }[] = [];
	for (const tool of tools) {
		const name = tool.data.name.trim();
		if (name.length < 3) continue;
		const isCommon = COMMON_WORD_NAMES.has(name.toLowerCase());
		const isLinked = linked.has(tool.id);
		if (isCommon && !isLinked) continue;

		const re = new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`, 'gi');
		let at = -1;
		for (const m of text.matchAll(re)) {
			// Reject "notion" when the product is "Notion" — proper nouns are capitalised in prose.
			const lowerName = name === name.toLowerCase();
			if (!lowerName && m[0] === m[0].toLowerCase()) continue;
			at = m.index ?? 0;
			break;
		}
		if (at < 0 && isLinked) at = text.length + tools.indexOf(tool); // linked but never named in prose
		if (at < 0) continue;
		hits.push({ tool, at });
	}

	return hits
		.sort((a, b) => a.at - b.at || a.tool.data.name.localeCompare(b.tool.data.name))
		.slice(0, max)
		.map((h) => h.tool);
}

/* ── "From the brief" ────────────────────────────────────────────────── */

export interface BriefLink {
	date: string;
	briefTitle: string;
	headline: string;
	why?: string;
	itemId: string;
	href: string;
}

interface EditorialItemJson { headline: string; why?: string; action?: string; angle?: string; tools?: string[] }
interface EditorialBriefJson { date: string; title: string; intro?: string; items: EditorialItemJson[] }

const slugifyId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const TITLE_STOPWORDS = new Set([
	'about', 'after', 'again', 'their', 'there', 'these', 'those', 'which', 'while', 'would', 'could', 'should',
	'every', 'other', 'where', 'because', 'explained', 'simply', 'guide', 'guides', 'beginners', 'actually',
	'really', 'thing', 'things', 'people', 'better', 'worse', 'tools', 'tool', 'using', 'without', 'inside',
]);

/**
 * The brief this explainer belongs to. An editorial brief item matches when its headline or its
 * "what to try" tools overlap the post's tags or title. Returns the strongest match, or null —
 * callers render nothing when there is no match.
 */
export function briefMatch(
	post: Post,
	briefs: Record<string, unknown>,
	minScore = 4,
): BriefLink | null {
	const tags = post.data.tags.map((t) => t.toLowerCase().trim()).filter(Boolean);
	const titleWords = post.data.title
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((w) => w.length >= 5 && !TITLE_STOPWORDS.has(w));

	let best: (BriefLink & { score: number }) | null = null;

	for (const mod of Object.values(briefs)) {
		const brief = ((mod as { default?: EditorialBriefJson }).default ?? mod) as EditorialBriefJson;
		if (!brief?.date || !Array.isArray(brief.items)) continue;

		for (const item of brief.items) {
			const headline = (item.headline ?? '').toLowerCase();
			if (!headline) continue;
			const itemTools = (item.tools ?? []).map((t) => t.toLowerCase());
			let score = 0;

			for (const tag of tags) {
				const slug = tag.replace(/\s+/g, '-');
				if (itemTools.includes(tag) || itemTools.includes(slug)) score += 5;
				else if (tag.length >= 4 && new RegExp(`(?<![a-z0-9])${escapeRe(tag)}(?![a-z0-9])`).test(headline)) score += 4;
			}
			for (const word of titleWords) {
				if (new RegExp(`(?<![a-z0-9])${escapeRe(word)}`).test(headline)) score += 2;
			}

			if (score >= minScore && (!best || score > best.score)) {
				const itemId = slugifyId(item.headline);
				best = {
					score,
					date: brief.date,
					briefTitle: brief.title,
					headline: item.headline,
					why: item.why,
					itemId,
					href: `/news/${brief.date}/#${itemId}`,
				};
			}
		}
	}

	if (!best) return null;
	const { score: _score, ...link } = best;
	return link;
}

/* ── related explainers ──────────────────────────────────────────────── */

/** Other explainers worth reading next: shared tags first, then same category, then recency. */
export function relatedExplainers(post: Post, all: Post[], limit = 3): Post[] {
	const tags = new Set(post.data.tags.map((t) => t.toLowerCase()));
	const scored = all
		.filter((p) => p.id !== post.id)
		.map((p) => {
			let score = 0;
			for (const t of p.data.tags) if (tags.has(t.toLowerCase())) score += 3;
			if (p.data.category === post.data.category) score += 2;
			return { post: p, score };
		})
		.sort((a, b) => b.score - a.score || b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf());

	return scored.slice(0, limit).map((s) => s.post);
}

/** Previous / next explainer in publication order (newest-first list). */
export function prevNext(post: Post, all: Post[]): { prev?: Post; next?: Post } {
	const ordered = byNewest(all);
	const i = ordered.findIndex((p) => p.id === post.id);
	if (i < 0) return {};
	return { next: ordered[i - 1], prev: ordered[i + 1] };
}
