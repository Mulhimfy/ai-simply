import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../../og/render';

interface NewsItem { title: string; link: string; date: string; source: string }
interface Snapshot { date: string; fetchedAt?: string; items: NewsItem[] }
interface EditorialBrief {
	date: string;
	title: string;
	intro?: string;
	items: { headline: string }[];
}
interface Props { date: string; snapshot?: Snapshot; brief?: EditorialBrief }

/**
 * Share card for one daily brief. The brief is the site's unit of sharing, so the
 * card leads with the editorial title when a hand-written brief exists and falls
 * back to the raw snapshot's story count when it does not.
 */
export const getStaticPaths = (async () => {
	const snapshots = import.meta.glob<Snapshot>('../../../data/news/*.json', { eager: true, import: 'default' });
	const briefs = import.meta.glob<EditorialBrief>('../../../data/briefs/*.json', { eager: true, import: 'default' });
	const dateOf = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');

	const byDate = new Map<string, Props>();
	for (const [path, snapshot] of Object.entries(snapshots)) {
		const date = dateOf(path);
		byDate.set(date, { date, snapshot });
	}
	for (const [path, brief] of Object.entries(briefs)) {
		const date = dateOf(path);
		byDate.set(date, { ...(byDate.get(date) ?? { date }), brief });
	}
	return [...byDate.values()].map((props) => ({ params: { date: props.date }, props }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = async ({ props }) => {
	const { date, snapshot, brief } = props;
	const displayDate = new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
		month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
	});

	const headlines = brief
		? brief.items.slice(0, 3).map((i) => i.headline)
		: (snapshot?.items ?? []).slice(0, 3).map((i) => i.title);
	const n = snapshot?.items.length ?? brief?.items.length ?? 0;

	const png = await renderOg({
		kind: 'news',
		eyebrow: `The brief · ${displayDate} · 3 min read`,
		title: brief?.title ?? (n === 1 ? '1 story that *mattered*' : `${n} stories that *mattered*`),
		headlines,
	});
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
