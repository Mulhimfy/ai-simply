/**
 * Shared helpers for the tools directory listing pages.
 * Pure functions over `CollectionEntry<'tools'>` — no DOM, no side effects.
 */
import type { CollectionEntry } from 'astro:content';
import { TOOL_CATEGORIES } from '../consts';

export type Tool = CollectionEntry<'tools'>;
export type SortMode = 'rating' | 'newest' | 'az';
export type Pricing = 'free' | 'freemium' | 'paid';

export const PRICING_LABELS: Record<Pricing, string> = { free: 'Free', freemium: 'Freemium', paid: 'Paid' };

/** "AI Image Generator" → "ai-image-generator" (same rule the routes use). */
export function toSlug(str: string): string {
	return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Category names already start with "AI"; "Others" reads better as "Other AI". */
export function categoryLabel(name: string): string {
	return name === 'Others' ? 'Other AI' : name;
}

/** Lowercase for mid-sentence use, keeping the "AI" initialism capitalised. */
export function lowerKeepAI(str: string): string {
	return str.replace(/[A-Za-z]+/g, (w) => (w === 'AI' ? w : w.toLowerCase()));
}

export function categoryName(slug: string): string {
	return TOOL_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

/**
 * Stable sort used for the server-rendered order (so the no-JS page matches the
 * default client state). Rated tools first, then featured, then newest, then name.
 */
export function sortTools(tools: Tool[], mode: SortMode = 'rating'): Tool[] {
	const byName = (a: Tool, b: Tool) => a.data.name.localeCompare(b.data.name, 'en', { sensitivity: 'base' });
	const byDate = (a: Tool, b: Tool) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
	return [...tools].sort((a, b) => {
		if (mode === 'az') return byName(a, b);
		if (mode === 'newest') return byDate(a, b) || byName(a, b);
		const r = (b.data.rating ?? 0) - (a.data.rating ?? 0);
		if (r) return r;
		const f = Number(!!b.data.featured) - Number(!!a.data.featured);
		if (f) return f;
		return byDate(a, b) || byName(a, b);
	});
}

export function countBy<K extends string>(tools: Tool[], key: (t: Tool) => K | undefined): Record<K, number> {
	const out = {} as Record<K, number>;
	for (const t of tools) {
		const k = key(t);
		if (k) out[k] = (out[k] ?? 0) + 1;
	}
	return out;
}

export function pricingBreakdown(tools: Tool[]): Record<Pricing, number> {
	return { free: 0, freemium: 0, paid: 0, ...countBy(tools, (t) => t.data.pricing as Pricing) };
}

/** Subcategories of a category that actually have tools, in taxonomy order, with counts. */
export function subcategoriesWithTools(allTools: Tool[], catSlug: string) {
	const cat = TOOL_CATEGORIES.find((c) => c.slug === catSlug);
	if (!cat) return [];
	const counts = countBy(allTools.filter((t) => t.data.category === catSlug), (t) => t.data.subcategory);
	return cat.subcategories
		.filter((s) => counts[s])
		.map((s) => ({ name: s, slug: toSlug(s), count: counts[s], href: `/tools/category/${catSlug}/${toSlug(s)}/` }));
}

/** Plain-English fallback intro for subcategories that have no hand-written one. */
export function subcategoryFallbackIntro(subName: string, catName: string, n: number): string {
	const sub = lowerKeepAI(subName);
	const cat = lowerKeepAI(categoryLabel(catName));
	const pl = n === 1 ? 'tool' : 'tools';
	return `${subName} sits inside our ${cat} category. We've reviewed ${n} ${sub} ${pl} so far — each one listed with pricing, what it does well, and where it falls short, so you can pick without a dozen open tabs.`;
}

/** "1 tool" / "6 tools" — collections and category tiles can hold exactly one. */
export function plural(n: number, one = 'tool', many = 'tools'): string {
	return `${n} ${n === 1 ? one : many}`;
}

/** The props ToolCard needs, pulled off a collection entry. */
export function cardProps(t: Tool) {
	const d = t.data;
	return {
		slug: t.id,
		name: d.name,
		description: d.description,
		category: d.category,
		subcategory: d.subcategory,
		pricing: d.pricing as Pricing,
		rating: d.rating,
		ratingCount: d.ratingCount,
		tags: d.tags,
		featured: d.featured,
		sponsored: d.sponsored,
		verified: d.verified,
		pubDate: d.pubDate,
	};
}
