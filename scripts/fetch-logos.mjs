#!/usr/bin/env node
/**
 * Fetches a real brand icon for every tool in src/content/tools/*.md and
 * saves a normalized 128x128 PNG to public/logos/<slug>.png.
 *
 * Resolution order (stops at first success — a real image >=32px on its
 * smaller side that is not fully transparent / a single flat colour):
 *   a. Parse the tool's homepage HTML for:
 *        <link rel="apple-touch-icon">
 *        <link rel="icon" ...> (largest `sizes`)
 *        <meta property="og:logo">
 *      plus guessed paths /apple-touch-icon.png and /favicon.ico
 *   b. https://icons.duckduckgo.com/ip3/<domain>.ico
 *   c. https://www.google.com/s2/favicons?domain=<domain>&sz=128
 *
 * Writes public/logos/_manifest.json: slug -> { source, width }.
 * Tools that never resolve an icon get source:'none' and no PNG file
 * (the UI falls back to a lettermark for those).
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TOOLS_DIR = join(ROOT, 'src', 'content', 'tools');
const OUT_DIR = join(ROOT, 'public', 'logos');

const CONCURRENCY = 8;
const TIMEOUT_MS = 10_000;
const SIZE = 128;
const MIN_SOURCE_PX = 32;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
	'user-agent': UA,
	accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
	'accept-language': 'en-US,en;q=0.9',
};
const IMAGE_HEADERS = { 'user-agent': UA, accept: 'image/*,*/*;q=0.8' };

// ---------- small utilities ----------

function parseFrontmatter(raw) {
	const norm = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const m = norm.match(/^---\s*\n([\s\S]*?)\n---/);
	if (!m) return {};
	const out = {};
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
		if (!kv) continue;
		const v = kv[2].trim().replace(/^['"]|['"]$/g, '').trim();
		if (v) out[kv[1]] = v;
	}
	return out;
}

async function fetchWithTimeout(url, init = {}) {
	const ac = new AbortController();
	const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
	try {
		return await fetch(url, { ...init, signal: ac.signal, redirect: 'follow' });
	} finally {
		clearTimeout(t);
	}
}

async function pool(tasks, n, run) {
	const queue = tasks.slice();
	const results = [];
	const workers = Array.from({ length: n }, async () => {
		while (queue.length) {
			const t = queue.shift();
			results.push(await run(t));
		}
	});
	await Promise.all(workers);
	return results;
}

function resolveHref(href, base) {
	try {
		return new URL(href, base).href;
	} catch {
		return null;
	}
}

// ---------- ICO parsing (sharp cannot read .ico) ----------

function parseIcoEntries(buf) {
	if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
		throw new Error('not an ICO');
	}
	const count = buf.readUInt16LE(4);
	const entries = [];
	for (let i = 0; i < count; i++) {
		const off = 6 + i * 16;
		if (off + 16 > buf.length) break;
		let width = buf.readUInt8(off);
		let height = buf.readUInt8(off + 1);
		if (width === 0) width = 256;
		if (height === 0) height = 256;
		const bytesInRes = buf.readUInt32LE(off + 8);
		const imageOffset = buf.readUInt32LE(off + 12);
		entries.push({ width, height, size: bytesInRes, offset: imageOffset });
	}
	entries.sort((a, b) => b.width * b.height - a.width * a.height);
	return entries;
}

/** Returns { buffer, width, height } for the largest PNG-encoded frame in an .ico. Throws if none found (e.g. only raw BMP/DIB frames, which sharp/libvips cannot decode). */
function extractIcoPng(buf) {
	const entries = parseIcoEntries(buf);
	for (const e of entries) {
		if (e.offset + e.size > buf.length) continue;
		const data = buf.subarray(e.offset, e.offset + e.size);
		if (data.length > 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
			return { buffer: Buffer.from(data), width: e.width, height: e.height };
		}
	}
	throw new Error('no PNG frame inside ICO');
}

function looksLikeIco(buf, url) {
	if (buf.length >= 4 && buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) return true;
	return /\.ico(\?|$)/i.test(url);
}

function looksLikeSvg(buf, url, contentType) {
	if (contentType && /svg/i.test(contentType)) return true;
	if (/\.svg(\?|$)/i.test(url)) return true;
	const head = buf.subarray(0, 256).toString('utf8').trimStart();
	return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
}

// ---------- image decode / normalize ----------

async function decodeToSharpInput(buf, url, contentType) {
	if (looksLikeIco(buf, url)) {
		const { buffer, width, height } = extractIcoPng(buf); // throws if unusable
		return { input: buffer, options: {} };
	}
	if (looksLikeSvg(buf, url, contentType)) {
		return { input: buf, options: { density: 384 } }; // rasterize SVG at high density before downscale
	}
	return { input: buf, options: {} };
}

/** Loads raw candidate bytes into a decoded sharp image, validates it's a real, non-blank icon, and returns the normalized 128x128 PNG buffer plus the source image's max dimension. */
async function normalizeCandidate(buf, url, contentType) {
	const { input, options } = await decodeToSharpInput(buf, url, contentType);
	const img = sharp(input, { failOn: 'none', ...options });
	const meta = await img.metadata();
	const w = meta.width ?? 0;
	const h = meta.height ?? 0;
	if (Math.min(w, h) < MIN_SOURCE_PX) throw new Error(`too small (${w}x${h})`);

	const stats = await img.clone().stats();
	const channels = stats.channels;
	const hasAlpha = channels.length === 4;
	if (hasAlpha && channels[3].max === 0) throw new Error('fully transparent');
	const allFlat = channels.every((c) => c.max - c.min <= 2);
	if (allFlat) throw new Error('single flat colour');

	const out = await img
		.clone()
		.resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png({ compressionLevel: 9, palette: true })
		.toBuffer();

	return { buffer: out, width: Math.max(w, h) };
}

async function tryUrl(url) {
	if (url.startsWith('data:')) {
		const m = url.match(/^data:([^;,]*)?(;base64)?,(.*)$/s);
		if (!m) throw new Error('bad data URL');
		const contentType = m[1] || '';
		const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'binary');
		return normalizeCandidate(buf, url, contentType);
	}
	const res = await fetchWithTimeout(url, { headers: IMAGE_HEADERS });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const contentType = res.headers.get('content-type') || '';
	const buf = Buffer.from(await res.arrayBuffer());
	if (buf.length < 16) throw new Error('empty response');
	return normalizeCandidate(buf, url, contentType);
}

// ---------- candidate discovery ----------

function extractSiteCandidates(html, baseUrl) {
	const candidates = [];
	const linkRe = /<link\b[^>]*>/gi;
	let appleTouch = null;
	let bestIcon = null;
	let bestIconSize = -1;
	for (const tag of html.match(linkRe) || []) {
		const relM = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
		const hrefM = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
		if (!relM || !hrefM) continue;
		const rels = relM[1].toLowerCase().split(/\s+/);
		const href = hrefM[1];
		if (!appleTouch && rels.some((r) => r.includes('apple-touch-icon'))) {
			appleTouch = href;
		} else if (rels.includes('icon') || rels.includes('shortcut')) {
			const sizesM = tag.match(/\bsizes\s*=\s*["']([^"']+)["']/i);
			let size = 0;
			if (sizesM) {
				for (const part of sizesM[1].split(/\s+/)) {
					const dm = part.match(/(\d+)x(\d+)/i);
					if (dm) size = Math.max(size, parseInt(dm[1], 10));
				}
			}
			if (size >= bestIconSize) {
				bestIconSize = size;
				bestIcon = href;
			}
		}
	}
	const ogLogoM =
		html.match(/<meta[^>]+property\s*=\s*["']og:logo["'][^>]+content\s*=\s*["']([^"']+)["']/i) ||
		html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+property\s*=\s*["']og:logo["']/i);

	if (appleTouch) candidates.push(appleTouch);
	if (bestIcon) candidates.push(bestIcon);
	if (ogLogoM) candidates.push(ogLogoM[1]);

	return candidates.map((href) => resolveHref(href, baseUrl)).filter(Boolean);
}

async function resolveIconForTool(toolUrl) {
	let origin, domain;
	try {
		const u = new URL(toolUrl);
		origin = u.origin;
		domain = u.hostname.replace(/^www\./, '');
	} catch {
		return { result: null, source: 'none', triedSite: false };
	}

	// --- (a) homepage HTML ---
	const siteCandidates = [];
	try {
		const res = await fetchWithTimeout(toolUrl, { headers: BROWSER_HEADERS });
		if (res.ok) {
			const html = (await res.text()).slice(0, 500_000);
			siteCandidates.push(...extractSiteCandidates(html, toolUrl));
		}
	} catch {
		/* homepage unreachable — fall through to guessed paths + fallbacks */
	}
	siteCandidates.push(`${origin}/apple-touch-icon.png`);
	siteCandidates.push(`${origin}/favicon.ico`);

	for (const url of siteCandidates) {
		try {
			const result = await tryUrl(url);
			return { result, source: 'site' };
		} catch {
			/* try next candidate */
		}
	}

	// --- (b) DuckDuckGo icon service ---
	try {
		const result = await tryUrl(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
		return { result, source: 'ddg' };
	} catch {
		/* fall through */
	}

	// --- (c) Google s2 favicons ---
	try {
		const result = await tryUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=${SIZE}`);
		return { result, source: 'google' };
	} catch {
		/* fall through */
	}

	return { result: null, source: 'none' };
}

// ---------- main ----------

async function loadTools() {
	const files = (await readdir(TOOLS_DIR)).filter((f) => /\.md$/.test(f));
	const tools = [];
	for (const file of files) {
		const slug = file.replace(/\.md$/, '');
		const fm = parseFrontmatter(await readFile(join(TOOLS_DIR, file), 'utf8'));
		if (!fm.url) {
			console.log(`${slug}: skip (no url in frontmatter)`);
			continue;
		}
		tools.push({ slug, url: fm.url, name: fm.name || slug });
	}
	return tools;
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const tools = await loadTools();
	console.log(`Fetching logos for ${tools.length} tools (concurrency=${CONCURRENCY})...\n`);

	const manifest = {};
	let ok = 0,
		none = 0;
	const bySource = { site: 0, ddg: 0, google: 0, none: 0 };
	const failed = [];

	await pool(tools, CONCURRENCY, async (tool) => {
		const { result, source } = await resolveIconForTool(tool.url);
		bySource[source]++;
		if (result) {
			await writeFile(join(OUT_DIR, `${tool.slug}.png`), result.buffer);
			manifest[tool.slug] = { source, width: result.width };
			ok++;
			console.log(`${tool.slug}: ok (${source}, src ${result.width}px -> ${SIZE}x${SIZE})`);
		} else {
			manifest[tool.slug] = { source: 'none', width: 0 };
			none++;
			failed.push(tool.slug);
			console.log(`${tool.slug}: none (no usable icon found)`);
		}
	});

	// keep manifest ordered by slug for stable diffs
	const orderedManifest = {};
	for (const slug of Object.keys(manifest).sort()) orderedManifest[slug] = manifest[slug];
	await writeFile(join(OUT_DIR, '_manifest.json'), JSON.stringify(orderedManifest, null, 2) + '\n');

	console.log(`\nDone. ok=${ok} none=${none} (site=${bySource.site} ddg=${bySource.ddg} google=${bySource.google})`);
	if (failed.length) {
		console.log('\nNo icon resolved for:');
		for (const slug of failed) console.log(`  - ${slug}`);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
