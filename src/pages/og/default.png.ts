import type { APIRoute } from 'astro';
import { renderOg } from '../../og/render';

/** Site-wide fallback card, used by pages without a more specific image. */
export const GET: APIRoute = async () => {
	const png = await renderOg({
		kind: 'site',
		eyebrow: 'Independent AI tool reviews',
		title: 'The best AI tools, *compared.*',
		subtitle: '200+ tools across 21 categories — tested hands-on, rated, and explained in plain English.',
	});
	return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
