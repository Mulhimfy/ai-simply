import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { BLOG_CATEGORIES } from '../../../consts';
import { renderOg } from '../../../og/render';

interface Props {
	post: CollectionEntry<'blog'>;
}

export const getStaticPaths = (async () => {
	const posts = await getCollection('blog');
	return posts.map((post) => ({ params: { slug: post.id }, props: { post } satisfies Props }));
}) satisfies GetStaticPaths;

function fmt(d: Date): string {
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export const GET: APIRoute<Props> = async ({ props }) => {
	const { post } = props;
	const category = BLOG_CATEGORIES[post.data.category]?.name ?? 'Article';
	const date = fmt(post.data.updatedDate ?? post.data.pubDate);
	const subtitle = [post.data.readingTime, date].filter(Boolean).join(' · ');
	const png = await renderOg({
		kind: 'article',
		eyebrow: category,
		title: post.data.title,
		subtitle,
	});
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
