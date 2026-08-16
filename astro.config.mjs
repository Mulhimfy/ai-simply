// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SITE = 'https://getaibriefs.com';

/**
 * Build a {pathname → lastmod ISO string} map by reading each
 * blog/tools markdown file's frontmatter (updatedDate ?? pubDate).
 * This replaces the old hand-maintained dictionary, so every article
 * gets accurate lastmod automatically.
 */
async function loadLastmodMap() {
	const map = {};

	async function indexCollection(dir, urlPrefix) {
		let files;
		try {
			files = await readdir(dir);
		} catch {
			return;
		}
		for (const file of files) {
			if (!/\.(md|mdx)$/.test(file)) continue;
			const slug = file.replace(/\.(md|mdx)$/, '');
			const raw = await readFile(join(dir, file), 'utf8');
			const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
			if (!fm) continue;
			const updated = fm[1].match(/^updatedDate:\s*['"]?([^'"\n]+)['"]?/m);
			const pub = fm[1].match(/^pubDate:\s*['"]?([^'"\n]+)['"]?/m);
			const date = (updated?.[1] ?? pub?.[1] ?? '').trim();
			if (!date) continue;
			const iso = new Date(date).toISOString();
			map[`${urlPrefix}${slug}/`] = iso;
		}
	}

	await indexCollection('./src/content/blog', '/blog/');
	await indexCollection('./src/content/tools', '/tools/');
	return map;
}

const lastmodMap = await loadLastmodMap();

const MIN_TOOLS_FOR_INDEX = 3; // keep in sync with src/pages/tools/category/[cat]/[sub].astro

function toSlug(str) {
	return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Subcategory pages holding fewer than MIN_TOOLS_FOR_INDEX tools are noindex'd
 * by the page template. Collect their pathnames so the sitemap agrees — a
 * sitemap that advertises noindex'd URLs is a Search Console warning.
 */
async function loadThinSubcategoryPaths() {
	const counts = new Map();
	let files = [];
	try {
		files = await readdir('./src/content/tools');
	} catch {
		return new Set();
	}
	for (const file of files) {
		if (!/\.(md|mdx)$/.test(file)) continue;
		const raw = await readFile(join('./src/content/tools', file), 'utf8');
		const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
		if (!fm) continue;
		const cat = fm[1].match(/^category:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim();
		const sub = fm[1].match(/^subcategory:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim();
		if (!cat || !sub) continue;
		const key = `/tools/category/${cat}/${toSlug(sub)}/`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return new Set(
		[...counts.entries()].filter(([, n]) => n < MIN_TOOLS_FOR_INDEX).map(([path]) => path),
	);
}

const thinSubcategoryPaths = await loadThinSubcategoryPaths();

/**
 * The staged test batch of comparison pages: those where both tools carry an
 * editorial rating. Mirrors `isTestBatch` in src/pages/tools/vs/[slug].astro —
 * every other /tools/vs/ page stays noindex and out of the sitemap.
 */
async function loadIndexableVsPaths() {
	const rated = new Map(); // slug -> subcategory-or-category key
	let files = [];
	try {
		files = await readdir('./src/content/tools');
	} catch {
		return new Set();
	}
	for (const file of files) {
		if (!/\.(md|mdx)$/.test(file)) continue;
		const raw = await readFile(join('./src/content/tools', file), 'utf8');
		const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
		if (!fm) continue;
		if (!/^rating:\s*[\d.]+/m.test(fm[1])) continue;
		const cat = fm[1].match(/^category:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim();
		const sub = fm[1].match(/^subcategory:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim();
		rated.set(file.replace(/\.(md|mdx)$/, ''), sub || cat);
	}
	// Pairs are only generated within a shared subcategory, and in readdir order.
	const slugs = [...rated.keys()];
	const paths = new Set();
	for (let i = 0; i < slugs.length; i++) {
		for (let j = i + 1; j < slugs.length; j++) {
			if (rated.get(slugs[i]) !== rated.get(slugs[j])) continue;
			paths.add(`/tools/vs/${slugs[i]}-vs-${slugs[j]}/`);
		}
	}
	return paths;
}

const indexableVsPaths = await loadIndexableVsPaths();

export default defineConfig({
	site: SITE,
	integrations: [
		mdx(),
		sitemap({
			filter: (page) => {
				const pathname = new URL(page).pathname;
				// Post-checkout confirmation is noindex'd; it's reachable only from Polar.
				if (pathname === '/submit/success/') return false;
				// Exclude noindex'd templated pages — they dilute crawl budget.
				if (pathname.startsWith('/tools/alternatives/')) return false;
				// Comparison pages: only the rated test batch is indexed.
				if (pathname.startsWith('/tools/vs/')) return indexableVsPaths.has(pathname);
				if (pathname.startsWith('/tools/tag/')) return false;
				// Dated news snapshots are noindex'd; the /news/ hub stays.
				if (/^\/news\/\d{4}-\d{2}-\d{2}\/$/.test(pathname)) return false;
				// Subcategory pages with too few tools are noindex'd.
				if (thinSubcategoryPaths.has(pathname)) return false;
				return true;
			},
			serialize(item) {
				const pathname = new URL(item.url).pathname;
				const lastmod = lastmodMap[pathname];
				if (lastmod) item.lastmod = lastmod;
				return item;
			},
		}),
	],
	build: {
		inlineStylesheets: 'auto',
	},
	compressHTML: true,
});
