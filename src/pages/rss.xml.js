import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { allBriefs } from '../lib/brief';

/**
 * The feed carries the product: every daily brief, plus the explainers.
 * A brief's description is its intro (editorial) or its headlines (automatic),
 * so a feed reader shows something worth reading without opening the page.
 */
export async function GET(context) {
	const snapshots = import.meta.glob('../data/news/*.json', { eager: true, import: 'default' });
	const editorials = import.meta.glob('../data/briefs/*.json', { eager: true, import: 'default' });
	const tools = (await getCollection('tools')).map((t) => ({
		slug: t.id,
		name: t.data.name,
		tags: t.data.tags ?? [],
		category: t.data.category,
		description: t.data.description,
		rating: t.data.rating,
	}));

	const briefItems = allBriefs(snapshots, editorials, tools)
		.slice(0, 60)
		.map((brief) => {
			const day = new Date(brief.date + 'T07:00:00Z');
			const lines = brief.items.map((i) => `<li>${escapeHtml(i.headline)}</li>`).join('');
			const intro = brief.intro ? `<p>${escapeHtml(brief.intro)}</p>` : '';
			return {
				title: `The brief — ${brief.title}`,
				link: `/news/${brief.date}/`,
				pubDate: day,
				description: brief.intro ?? brief.items.map((i) => i.headline).join(' · '),
				content: `${intro}<ul>${lines}</ul><p><a href="${context.site}news/${brief.date}/">Read the full brief</a></p>`,
				categories: [...new Set(brief.items.map((i) => i.angle))],
			};
		});

	const posts = (await getCollection('blog')).map((post) => ({
		title: post.data.title,
		link: `/blog/${post.id}/`,
		pubDate: post.data.pubDate,
		description: post.data.description,
		categories: [post.data.category],
	}));

	const items = [...briefItems, ...posts].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items,
		customData: '<language>en-us</language>',
	});
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
