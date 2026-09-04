import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { TOOL_CATEGORIES } from '../../../consts';
import { renderOg, toolLogoPath, toolScreenshotPath } from '../../../og/render';

interface Props {
	tool: CollectionEntry<'tools'>;
}

export const getStaticPaths = (async () => {
	const tools = await getCollection('tools');
	return tools.map((tool) => ({ params: { slug: tool.id }, props: { tool } satisfies Props }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = async ({ props }) => {
	const { tool } = props;
	const cat = TOOL_CATEGORIES.find((c) => c.slug === tool.data.category);
	const catName = cat?.name ?? 'AI Tool';
	const sub = tool.data.subcategory;
	// Some subcategories repeat the category name ("AI Chatbot · AI Chatbot").
	const eyebrow = sub && sub.toLowerCase() !== catName.toLowerCase() ? `${catName} · ${sub}` : catName;
	const png = await renderOg({
		kind: 'tool',
		eyebrow,
		title: tool.data.name,
		subtitle: tool.data.description,
		pricing: tool.data.pricing,
		rating: tool.data.rating,
		logo: toolLogoPath(tool.id),
		screenshot: toolScreenshotPath(tool.id),
	});
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
