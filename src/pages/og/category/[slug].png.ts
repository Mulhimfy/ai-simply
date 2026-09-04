import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { TOOL_CATEGORIES, type ToolCategory } from '../../../consts';
import { renderOg } from '../../../og/render';

interface Props {
	category: ToolCategory;
	count: number;
}

export const getStaticPaths = (async () => {
	const tools = await getCollection('tools');
	const counts = new Map<string, number>();
	for (const t of tools) counts.set(t.data.category, (counts.get(t.data.category) ?? 0) + 1);
	return TOOL_CATEGORIES.map((category) => ({
		params: { slug: category.slug },
		props: { category, count: counts.get(category.slug) ?? 0 } satisfies Props,
	}));
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = async ({ props }) => {
	const { category, count } = props;
	const subtitle = count === 1 ? '1 tool, reviewed' : `${count} tools, compared`;
	const png = await renderOg({
		kind: 'category',
		eyebrow: 'AI Tools',
		title: category.name,
		subtitle,
	});
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
