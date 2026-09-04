import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { TOOL_CATEGORIES } from '../../../consts';
import { renderOg, toolLogoPath } from '../../../og/render';

type Tool = CollectionEntry<'tools'>;

interface Props {
	toolA: Tool;
	toolB: Tool;
}

/**
 * Mirrors the pairing in `src/pages/tools/vs/[slug].astro`: tools sharing a
 * subcategory (or category, when unset) are paired in collection order as
 * `<a>-vs-<b>`. Only the indexable batch — both tools carrying an editorial
 * rating — gets a card; the other ~190 comparison pages are noindex'd and
 * would just cost build time.
 */
export const getStaticPaths = (async () => {
	const tools = await getCollection('tools');
	const bySub: Record<string, Tool[]> = {};
	for (const t of tools) {
		const key = t.data.subcategory ?? t.data.category;
		(bySub[key] ??= []).push(t);
	}
	const paths: { params: { slug: string }; props: Props }[] = [];
	for (const group of Object.values(bySub)) {
		if (group.length < 2) continue;
		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const a = group[i];
				const b = group[j];
				if (!a.data.rating || !b.data.rating) continue;
				paths.push({ params: { slug: `${a.id}-vs-${b.id}` }, props: { toolA: a, toolB: b } });
			}
		}
	}
	return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = async ({ props }) => {
	const { toolA, toolB } = props;
	const cat = TOOL_CATEGORIES.find((c) => c.slug === toolA.data.category);
	const year = new Date().getFullYear();
	const png = await renderOg({
		kind: 'vs',
		eyebrow: 'Head-to-head',
		title: `${toolA.data.name} vs ${toolB.data.name}`,
		subtitle: `Which ${cat?.name ?? 'AI'} tool is better in ${year}? Features, pricing and ratings compared.`,
		left: { name: toolA.data.name, logo: toolLogoPath(toolA.id) },
		right: { name: toolB.data.name, logo: toolLogoPath(toolB.id) },
	});
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
