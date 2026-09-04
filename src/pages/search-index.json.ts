import { getCollection } from 'astro:content';
import { TOOL_CATEGORIES, BLOG_CATEGORIES } from '../consts';
import { existsSync } from 'node:fs';

/**
 * Static search index consumed lazily by the ⌘K command palette.
 * Built once; fetched once per visitor (cached by the browser/CDN).
 */
export async function GET() {
	const tools = await getCollection('tools');
	const posts = await getCollection('blog');
	const catName = (slug: string) => TOOL_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

	// Every statically generated /tools/vs/ slug (mirrors getStaticPaths in tools/vs/[slug].astro)
	const bySub: Record<string, string[]> = {};
	for (const t of tools) {
		const key = t.data.subcategory ?? t.data.category;
		(bySub[key] ??= []).push(t.id);
	}
	const vs: string[] = [];
	for (const group of Object.values(bySub)) {
		for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) vs.push(`${group[i]}-vs-${group[j]}`);
	}

	const index = {
		tools: tools
			.sort((a, b) => (b.data.rating ?? 0) - (a.data.rating ?? 0))
			.map((t) => ({
				n: t.data.name,
				d: t.data.description,
				u: `/tools/${t.id}/`,
				c: catName(t.data.category),
				cs: t.data.category,
				p: t.data.pricing,
				r: t.data.rating ?? null,
				l: existsSync(`public/logos/${t.id}.png`) ? `/logos/${t.id}.png` : null,
				t: t.data.tags.slice(0, 6),
			})),
		articles: posts
			.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
			.map((p) => ({
				n: p.data.title,
				d: p.data.description,
				u: `/blog/${p.id}/`,
				c: BLOG_CATEGORIES[p.data.category]?.name ?? p.data.category,
				rt: p.data.readingTime ?? null,
			})),
		categories: TOOL_CATEGORIES.map((c) => ({
			n: c.name,
			d: c.description,
			u: `/tools/category/${c.slug}/`,
			i: c.slug,
			k: tools.filter((t) => t.data.category === c.slug).length,
		})),
		vs,
		pages: [
			{ n: 'Find my AI tool (quiz)', u: '/tools/quiz/', d: '5 questions, personalised picks' },
			{ n: 'Compare tools', u: '/tools/vs/', d: 'Head-to-head comparisons' },
			{ n: 'AI News', u: '/news/', d: 'Daily brief from the best sources' },
			{ n: 'Articles', u: '/blog/', d: 'AI explained in plain English' },
			{ n: 'Reviews', u: '/reviews/', d: 'Hands-on, rated' },
			{ n: 'Top rated tools', u: '/tools/top-rated/', d: 'Highest editorial scores' },
			{ n: 'New tools', u: '/tools/new/', d: 'Recently added' },
			{ n: 'Collections', u: '/tools/collections/', d: 'Curated stacks by use case' },
			{ n: 'Submit a tool', u: '/submit/', d: 'Get listed in the directory' },
			{ n: 'Pricing', u: '/pricing/', d: 'Listing plans' },
			{ n: 'About', u: '/about/', d: 'Who we are and how we rate' },
			{ n: 'Contact', u: '/contact/', d: 'Get in touch' },
		],
	};
	return new Response(JSON.stringify(index), {
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
	});
}
