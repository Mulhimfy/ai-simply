/**
 * Build-time Open Graph share cards — "Ink & Signal".
 *
 * Pipeline: element tree → satori (SVG) → resvg (PNG) → sharp (re-encode).
 * No browser; runs inside `astro build` via the endpoints in `src/pages/og/`.
 *
 * Performance notes (≈400 cards per build, so every card must be cheap):
 *  - satori turns CSS gradients into SVG <pattern>s and box-shadows into blur
 *    filters; resvg renders both slowly (0.8 s and 6 s respectively on a full
 *    card). All atmosphere — grid, vignette, glows, the screenshot's drop
 *    shadow — is therefore drawn once as a plain SVG with native gradients,
 *    cached, and embedded as a single <img> layer. Nothing else casts a shadow.
 *  - Fonts and resized images are cached in module scope.
 *  - Finished PNGs are cached on disk under node_modules/.cache/aib-og/, keyed
 *    by the options plus content hashes of the assets and this file, so
 *    unchanged cards cost a file read on rebuilds (locally and on Vercel,
 *    which restores node_modules/.cache between builds).
 *
 * See `src/og/README.md` for usage.
 */
import satori, { type SatoriOptions } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type OgKind = 'tool' | 'article' | 'vs' | 'category' | 'news' | 'quiz' | 'site';

export interface OgSide {
	name: string;
	/** Absolute path to a PNG logo. Falls back to a lettermark when missing. */
	logo?: string;
}

export interface OgOptions {
	kind: OgKind;
	/**
	 * Main title. Wrap one word in asterisks (`"N stories that *mattered*"`)
	 * to set it in Instrument Serif Italic + signal orange.
	 */
	title: string;
	subtitle?: string;
	eyebrow?: string;
	/** Absolute path to a PNG logo (tool / quiz). */
	logo?: string;
	/** Absolute path to a 1200×630 JPG screenshot (tool / quiz). */
	screenshot?: string;
	rating?: number;
	pricing?: string;
	left?: OgSide;
	right?: OgSide;
	/** news: up to three headlines listed under the title (preferred over `subtitle`). */
	headlines?: string[];
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Render a 1200×630 PNG share card. Served from the disk cache when an
 * identical card was rendered before; set `AIB_OG_NO_CACHE=1` to bypass.
 */
export async function renderOg(opts: OgOptions): Promise<Buffer> {
	if (!CACHE_ENABLED) return renderUncached(opts);
	const file = join(CACHE_DIR, `${cacheKey(opts)}.png`);
	try {
		const hit = readFileSync(file);
		cacheStats.hits++;
		return hit;
	} catch {
		/* miss */
	}
	const png = await renderUncached(opts);
	cacheStats.misses++;
	try {
		mkdirSync(CACHE_DIR, { recursive: true });
		// Write-then-rename so a killed build never leaves a truncated card.
		const tmp = `${file}.${process.pid}.tmp`;
		writeFileSync(tmp, png);
		renameSync(tmp, file);
	} catch {
		/* cache is best-effort */
	}
	return png;
}

async function renderUncached(opts: OgOptions): Promise<Buffer> {
	const { svg, atmosphere: atmo } = await buildCard(opts);
	const fg = rasterise(svg);
	const bg = await atmosphere(atmo);
	// resvg decodes embedded rasters slowly (~140 ms for a full-canvas PNG),
	// so the background never passes through it: the foreground is rendered
	// on a transparent canvas and composited over the cached backdrop here.
	return sharp(bg, { raw: RAW })
		.composite([{ input: fg, raw: { ...RAW, premultiplied: true } }])
		.png({ compressionLevel: 6, adaptiveFiltering: false })
		.toBuffer();
}

/** The foreground SVG (transparent background) — handy for debugging layout. */
export async function renderOgSvg(opts: OgOptions): Promise<string> {
	return (await buildCard(opts)).svg;
}

const RAW = { width: OG_WIDTH, height: OG_HEIGHT, channels: 4 } as const;

async function buildCard(opts: OgOptions): Promise<{ svg: string; atmosphere: Atmosphere }> {
	const card = await buildTree(opts);
	const svg = await satori(card.tree as any, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts: loadFonts(),
	});
	return { svg, atmosphere: card.atmosphere };
}

/** SVG → premultiplied RGBA pixels at 1200×630. */
function rasterise(svg: string): Buffer {
	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: OG_WIDTH },
		font: { loadSystemFonts: false },
	});
	return Buffer.from(resvg.render().pixels);
}

/** `public/logos/<slug>.png` if it exists (another pipeline generates these). */
export function toolLogoPath(slug: string): string | undefined {
	return publicAsset(`logos/${slug}.png`);
}

/** `public/tools/<slug>.jpg` if it exists. */
export function toolScreenshotPath(slug: string): string | undefined {
	return publicAsset(`tools/${slug}.jpg`);
}

function publicAsset(rel: string): string | undefined {
	const p = join(process.cwd(), 'public', rel);
	return existsSync(p) ? p : undefined;
}

/* ------------------------------------------------------------------ */
/* Disk cache                                                          */
/* ------------------------------------------------------------------ */

export const CACHE_DIR = join(process.cwd(), 'node_modules/.cache/aib-og');
const CACHE_ENABLED = !process.env.AIB_OG_NO_CACHE;
export const cacheStats = { hits: 0, misses: 0 };

function sha1(data: string | Buffer): string {
	return createHash('sha1').update(data).digest('hex');
}

/**
 * Content hashes rather than mtimes: git checkouts (and therefore Vercel
 * builds) reset every mtime, which would make the cache miss on every CI run.
 */
const assetHashCache = new Map<string, string>();
function assetFingerprint(path: string | undefined): string {
	if (!path) return '-';
	let h = assetHashCache.get(path);
	if (!h) {
		try {
			h = sha1(readFileSync(path));
		} catch {
			h = 'missing';
		}
		assetHashCache.set(path, h);
	}
	return h;
}

let rendererHash: string | null = null;
function rendererFingerprint(): string {
	if (!rendererHash) {
		const candidates = [join(process.cwd(), 'src/og/render.ts'), new URL(import.meta.url).pathname];
		const src = candidates.find((p) => existsSync(p));
		rendererHash = src ? sha1(readFileSync(src)) : 'unknown';
	}
	return rendererHash;
}

function cacheKey(opts: OgOptions): string {
	const rel = (p: string | undefined) => (p ? relative(process.cwd(), p) : undefined);
	const normalised = {
		...opts,
		logo: rel(opts.logo),
		screenshot: rel(opts.screenshot),
		left: opts.left ? { ...opts.left, logo: rel(opts.left.logo) } : undefined,
		right: opts.right ? { ...opts.right, logo: rel(opts.right.logo) } : undefined,
	};
	return sha1(
		[
			JSON.stringify(normalised),
			assetFingerprint(opts.screenshot),
			assetFingerprint(opts.logo),
			assetFingerprint(opts.left?.logo),
			assetFingerprint(opts.right?.logo),
			rendererFingerprint(),
		].join('|'),
	);
}

/** Drop every cached card (used by tests / when the brand changes). */
export function clearOgCache(): void {
	try {
		for (const f of readdirSync(CACHE_DIR)) unlinkSync(join(CACHE_DIR, f));
	} catch {
		/* nothing cached */
	}
}

if (CACHE_ENABLED) {
	process.on('exit', () => {
		const { hits, misses } = cacheStats;
		if (hits + misses) console.log(`[og] share cards: ${hits} from cache, ${misses} rendered (${CACHE_DIR})`);
	});
}

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

const W = OG_WIDTH;
const H = OG_HEIGHT;
const PAD = 72;
const INK = '#0a0a0b';
const SURFACE = '#17171a';
const TEXT = '#f5f5f4';
const MUTED = '#8f8f97';
const SIGNAL = '#ff6a35';
const HAIR = 'rgba(255,255,255,0.10)';
const INTER = 'Inter';
const SERIF = 'Instrument Serif';

/* Screenshot window geometry (shared by the satori card and its SVG shadow). */
const CARD_W = 520;
const CARD_H = 350;
const CARD_X = W - PAD - CARD_W + 28;
const CARD_Y = (H - CARD_H) / 2 + 6;
const CARD_TILT = -4;

/* ------------------------------------------------------------------ */
/* Fonts (module-scope cache)                                          */
/* ------------------------------------------------------------------ */

type Font = SatoriOptions['fonts'][number];
let fontCache: Font[] | null = null;

function fontDir(): string {
	const candidates = [
		join(process.cwd(), 'src/og/fonts'),
		new URL('./fonts/', import.meta.url).pathname,
	];
	return candidates.find((d) => existsSync(join(d, 'Inter-Medium.ttf'))) ?? candidates[0];
}

function loadFonts(): Font[] {
	if (fontCache) return fontCache;
	const dir = fontDir();
	fontCache = [
		{ name: INTER, data: readFileSync(join(dir, 'Inter-Medium.ttf')), weight: 500, style: 'normal' },
		{ name: INTER, data: readFileSync(join(dir, 'Inter-SemiBold.ttf')), weight: 600, style: 'normal' },
		{ name: SERIF, data: readFileSync(join(dir, 'InstrumentSerif-Italic.ttf')), weight: 400, style: 'italic' },
	];
	return fontCache;
}

/* ------------------------------------------------------------------ */
/* Images (module-scope cache of resized, base64-embedded assets)      */
/* ------------------------------------------------------------------ */

interface LogoAsset {
	uri: string;
	/** Transparent logos get a tile whose colour contrasts with the artwork. */
	tile: string | null;
}

const logoCache = new Map<string, Promise<LogoAsset | null>>();
const shotCache = new Map<string, Promise<string | null>>();

function logoAsset(path: string | undefined): Promise<LogoAsset | null> {
	if (!path) return Promise.resolve(null);
	let p = logoCache.get(path);
	if (!p) {
		p = (async () => {
			try {
				const img = sharp(path).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
				const { data, info } = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
				// Coverage + luminance of the opaque pixels decide the backing tile.
				let opaque = 0;
				let lum = 0;
				for (let i = 0; i < data.length; i += info.channels) {
					if (data[i + 3] > 128) {
						opaque++;
						lum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
					}
				}
				const coverage = opaque / (info.width * info.height);
				const meanLum = opaque ? lum / opaque : 255;
				const tile = coverage > 0.92 ? null : meanLum < 150 ? '#ffffff' : SURFACE;
				const png = await img.png().toBuffer();
				return { uri: `data:image/png;base64,${png.toString('base64')}`, tile };
			} catch {
				return null;
			}
		})();
		logoCache.set(path, p);
	}
	return p;
}

function screenshotAsset(path: string | undefined): Promise<string | null> {
	if (!path) return Promise.resolve(null);
	let p = shotCache.get(path);
	if (!p) {
		p = sharp(path)
			.resize({ width: 560, withoutEnlargement: true })
			.jpeg({ quality: 72, mozjpeg: true })
			.toBuffer()
			.then((b) => `data:image/jpeg;base64,${b.toString('base64')}`)
			.catch(() => null);
		shotCache.set(path, p);
	}
	return p;
}

/* ------------------------------------------------------------------ */
/* Background atmosphere (one cached SVG per glow configuration)       */
/* ------------------------------------------------------------------ */

interface Atmosphere {
	/** Glow centre as a fraction of the canvas, and peak alpha. */
	glow?: { x: number; y: number; strength: number };
	/** Draw the drop shadow for the screenshot window. */
	cardShadow?: boolean;
}

const atmosphereCache = new Map<string, Promise<Buffer>>();

/**
 * Raw RGBA pixels of the backdrop. Each configuration is rasterised once
 * (the full-canvas gradients cost resvg ~150 ms) and kept in memory — a
 * handful of 3 MB buffers for the whole build.
 */
function atmosphere(a: Atmosphere): Promise<Buffer> {
	const key = JSON.stringify(a);
	let p = atmosphereCache.get(key);
	if (!p) {
		p = (async () => {
			const raw = rasterise(atmosphereSvg(a));
			// The backdrop is fully opaque, so premultiplied == straight alpha.
			return sharp(raw, { raw: RAW }).flatten({ background: INK }).ensureAlpha().raw().toBuffer();
		})();
		atmosphereCache.set(key, p);
	}
	return p;
}

function atmosphereSvg(a: Atmosphere): string {

	// 48px hairline grid as a single path — far cheaper than a <pattern>.
	let grid = '';
	for (let x = 48; x < W; x += 48) grid += `M${x} 0V${H}`;
	for (let y = 48; y < H; y += 48) grid += `M0 ${y}H${W}`;

	let glowDefs = '';
	let glowRect = '';
	if (a.glow) {
		const cx = a.glow.x * W;
		const cy = a.glow.y * H;
		// CSS `circle` radial gradients size to the farthest corner.
		const r = Math.max(
			Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy),
		);
		const s = a.glow.strength;
		glowDefs =
			`<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">` +
			`<stop offset="0" stop-color="${SIGNAL}" stop-opacity="${s}"/>` +
			`<stop offset="0.22" stop-color="${SIGNAL}" stop-opacity="${(s * 0.35).toFixed(3)}"/>` +
			`<stop offset="0.42" stop-color="${SIGNAL}" stop-opacity="0.04"/>` +
			`<stop offset="0.6" stop-color="${SIGNAL}" stop-opacity="0"/></radialGradient>`;
		glowRect = `<rect width="${W}" height="${H}" fill="url(#g)"/>`;
	}

	let shadow = '';
	if (a.cardShadow) {
		const cx = CARD_X + CARD_W / 2;
		const cy = CARD_Y + CARD_H / 2;
		const rings: [number, number][] = [[0, 0.5], [10, 0.22], [24, 0.12], [44, 0.06]];
		shadow = `<g transform="rotate(${CARD_TILT} ${cx} ${cy}) translate(0 26)">`;
		for (const [grow, alpha] of rings) {
			shadow +=
				`<rect x="${CARD_X - grow}" y="${CARD_Y - grow}" width="${CARD_W + grow * 2}" height="${CARD_H + grow * 2}" ` +
				`rx="${20 + grow}" fill="#000" fill-opacity="${alpha}"/>`;
		}
		shadow += '</g>';
	}

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
		'<defs>' +
		// Vignette: the grid recedes towards the bottom-right.
		`<linearGradient id="v" x1="0" y1="0" x2="1" y2="1"><stop offset="0.3" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.85"/></linearGradient>` +
		// Faint orange wash top-left, behind the signal bar.
		`<radialGradient id="w" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="520"><stop offset="0" stop-color="${SIGNAL}" stop-opacity="0.2"/><stop offset="1" stop-color="${SIGNAL}" stop-opacity="0"/></radialGradient>` +
		// Halo around the 6px signal bar (replaces a box-shadow blur).
		`<radialGradient id="s" gradientUnits="userSpaceOnUse" cx="${PAD + 3}" cy="${PAD + 20}" r="72"><stop offset="0" stop-color="${SIGNAL}" stop-opacity="0.55"/><stop offset="0.35" stop-color="${SIGNAL}" stop-opacity="0.16"/><stop offset="1" stop-color="${SIGNAL}" stop-opacity="0"/></radialGradient>` +
		glowDefs +
		'</defs>' +
		`<rect width="${W}" height="${H}" fill="${INK}"/>` +
		`<path d="${grid}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>` +
		`<rect width="${W}" height="${H}" fill="url(#v)"/>` +
		`<rect width="${W}" height="${H}" fill="url(#w)"/>` +
		glowRect +
		`<rect width="${W}" height="${H}" fill="url(#s)"/>` +
		shadow +
		'</svg>';

	return svg;
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

/**
 * Keep only glyphs the bundled fonts can draw. Emoji, non-Latin scripts and
 * stray combining marks (news headlines occasionally carry them) would
 * otherwise render as tofu.
 */
function clean(s: string): string {
	return s
		.normalize('NFC')
		.replace(/[\p{Extended_Pictographic}️‍⃣]/gu, '')
		.replace(/[^\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Common}]/gu, '')
		.replace(/\p{Mn}/gu, '')
		.replace(/\s+([:;,.!?])/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Title size adapts to length: 72px ≤ 40 chars, 60px ≤ 70, 50px otherwise —
 * thresholds scale with the column width (full width = 1056px).
 */
function titleSize(title: string, width = W - PAD * 2): number {
	const k = width / (W - PAD * 2);
	const n = title.length;
	if (n <= 40 * k) return 72;
	if (n <= 70 * k) return 60;
	return 50;
}

/** Rough line-count estimate for Inter SemiBold at −0.03em tracking. */
function estimateLines(s: string, size: number, width: number): number {
	return Math.max(1, Math.ceil((s.length * size * 0.55) / width));
}

function firstLetter(name: string): string {
	const m = clean(name).match(/[\p{L}\p{N}]/u);
	return (m?.[0] ?? '?').toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Element helpers (satori takes a React-like tree, no JSX needed)     */
/* ------------------------------------------------------------------ */

type Style = Record<string, string | number>;
interface El { type: string; props: Record<string, unknown> }
type Child = El | string | null | false | undefined;

function el(type: string, props: Record<string, unknown>, children?: Child | Child[]): El {
	const kids = Array.isArray(children) ? children.filter(Boolean) : children;
	return { type, props: { ...props, children: kids } };
}

/** A flex box. Satori requires explicit `display: flex` on any multi-child div. */
function box(style: Style, ...children: Child[]): El {
	return el('div', { style: { display: 'flex', ...style } }, children);
}

/** A text node. satori only applies `lineClamp` to `display: block` elements. */
function text(style: Style, content: string): El {
	const s = 'lineClamp' in style ? { display: 'block', ...style } : style;
	return el('div', { style: s }, clean(content));
}

function img(src: string, style: Style): El {
	return el('img', { src, style });
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** Signal bar + uppercase eyebrow. */
function header(eyebrow: string | undefined): El {
	return box(
		{ alignItems: 'center', height: 40 },
		box({ width: 6, height: 40, borderRadius: 3, backgroundColor: SIGNAL }),
		eyebrow
			? text(
					{
						marginLeft: 22,
						maxWidth: W - PAD * 2 - 28,
						fontFamily: INTER,
						fontWeight: 500,
						fontSize: 20,
						letterSpacing: '0.12em',
						textTransform: 'uppercase',
						color: MUTED,
						lineClamp: 1,
					},
					eyebrow,
				)
			: null,
	);
}

/** Wordmark bottom-left, domain bottom-right. */
function footer(): El {
	return box(
		{ justifyContent: 'space-between', alignItems: 'center', height: 32 },
		box(
			{ alignItems: 'center' },
			box({ width: 12, height: 12, borderRadius: 6, backgroundColor: SIGNAL, marginRight: 14 }),
			text({ fontFamily: INTER, fontWeight: 600, fontSize: 26, letterSpacing: '-0.02em', color: TEXT }, 'AI Briefs'),
		),
		text({ fontFamily: INTER, fontWeight: 500, fontSize: 22, letterSpacing: '0.01em', color: MUTED }, 'getaibriefs.com'),
	);
}

interface Card {
	tree: El;
	atmosphere: Atmosphere;
}

/**
 * Card frame: absolute overlays, then the padded header/body/footer column.
 * The root is transparent — the backdrop is composited in afterwards.
 */
function frame(atmosphere: Atmosphere, overlays: Child[], eyebrow: string | undefined, body: El): Card {
	const tree = box(
		{ position: 'relative', width: W, height: H, fontFamily: INTER, color: TEXT },
		...overlays,
		box(
			{
				position: 'absolute',
				left: 0,
				top: 0,
				width: W,
				height: H,
				padding: PAD,
				flexDirection: 'column',
				justifyContent: 'space-between',
			},
			header(eyebrow),
			body,
			footer(),
		),
	);
	return { tree, atmosphere };
}

/**
 * A title with an optional `*accent*` word set in serif italic + signal.
 * Plain titles use satori's lineClamp; accented ones wrap word-by-word.
 */
function title(raw: string, size: number, opts: { width?: number; lines?: number; align?: 'left' | 'center' } = {}): El {
	const { width, lines = 3, align = 'left' } = opts;
	const base: Style = {
		fontFamily: INTER,
		fontWeight: 600,
		fontSize: size,
		lineHeight: 1.06,
		letterSpacing: '-0.03em',
		color: TEXT,
	};
	const m = raw.match(/^(.*?)\*([^*]+)\*(.*)$/s);
	if (!m) {
		return text({ ...base, ...(width ? { width } : {}), lineClamp: lines, textAlign: align }, raw);
	}
	const words: El[] = [];
	const push = (chunk: string, accent: boolean) => {
		for (const w of clean(chunk).split(' ').filter(Boolean)) {
			words.push(
				text(
					accent
						? { fontFamily: SERIF, fontWeight: 400, fontStyle: 'italic', fontSize: size * 1.12, lineHeight: 0.95, letterSpacing: '-0.01em', color: SIGNAL, marginRight: size * 0.22 }
						: { ...base, marginRight: size * 0.22 },
					w,
				),
			);
		}
	};
	push(m[1], false);
	push(m[2], true);
	push(m[3], false);
	return box(
		{ flexWrap: 'wrap', alignItems: 'baseline', justifyContent: align === 'center' ? 'center' : 'flex-start', ...(width ? { width } : {}) },
		...words,
	);
}

function serifLine(content: string, size: number, color = MUTED, lines = 2, extra: Style = {}): El {
	return text(
		{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: size, lineHeight: 1.2, color, lineClamp: lines, ...extra },
		content,
	);
}

/** Rounded logo tile or a lettermark circle. */
function mark(name: string, asset: LogoAsset | null, size: number): El {
	const radius = Math.round(size * 0.26);
	if (asset) {
		if (asset.tile) {
			const pad = Math.round(size * 0.14);
			return box(
				{
					width: size,
					height: size,
					borderRadius: radius,
					backgroundColor: asset.tile,
					border: `1px solid ${asset.tile === '#ffffff' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.16)'}`,
					padding: pad,
					alignItems: 'center',
					justifyContent: 'center',
				},
				img(asset.uri, { width: size - pad * 2, height: size - pad * 2, objectFit: 'contain' }),
			);
		}
		return box(
			{ width: size, height: size, borderRadius: radius, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)' },
			img(asset.uri, { width: size, height: size, objectFit: 'cover' }),
		);
	}
	return box(
		{
			width: size,
			height: size,
			borderRadius: size / 2,
			backgroundColor: SURFACE,
			border: '1px solid rgba(255,255,255,0.16)',
			alignItems: 'center',
			justifyContent: 'center',
		},
		text(
			{ fontFamily: INTER, fontWeight: 600, fontSize: Math.round(size * 0.46), letterSpacing: '-0.03em', color: SIGNAL, marginTop: -Math.round(size * 0.02) },
			firstLetter(name),
		),
	);
}

const STAR = 'M12 2.6l2.85 5.95 6.5.85-4.75 4.55 1.2 6.5L12 17.35l-5.8 3.1 1.2-6.5L2.65 9.4l6.5-.85z';

function star(fill: string, size: number): El {
	return el('svg', { width: size, height: size, viewBox: '0 0 24 24' }, el('path', { d: STAR, fill }));
}

function stars(rating: number, size = 24): El {
	const items: El[] = [];
	for (let i = 0; i < 5; i++) {
		const f = Math.max(0, Math.min(1, rating - i));
		if (f >= 0.75) items.push(star(SIGNAL, size));
		else if (f >= 0.25) {
			items.push(
				box(
					{ position: 'relative', width: size, height: size },
					star('rgba(255,255,255,0.18)', size),
					box({ position: 'absolute', left: 0, top: 0, width: size / 2, height: size, overflow: 'hidden' }, star(SIGNAL, size)),
				),
			);
		} else items.push(star('rgba(255,255,255,0.18)', size));
	}
	return box(
		{ alignItems: 'center' },
		box({ alignItems: 'center', gap: 3 }, ...items),
		text({ marginLeft: 12, fontFamily: INTER, fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em', color: TEXT }, rating.toFixed(1)),
		text({ marginLeft: 6, fontFamily: INTER, fontWeight: 500, fontSize: 18, color: MUTED }, '/ 5'),
	);
}

const PRICING_LABEL: Record<string, string> = { free: 'Free', freemium: 'Freemium', paid: 'Paid' };

function pill(label: string, accent = false): El {
	return box(
		{
			alignItems: 'center',
			height: 38,
			paddingLeft: 16,
			paddingRight: 16,
			borderRadius: 999,
			border: `1px solid ${accent ? 'rgba(255,106,53,0.55)' : 'rgba(255,255,255,0.16)'}`,
			backgroundColor: accent ? 'rgba(255,106,53,0.10)' : 'rgba(255,255,255,0.04)',
		},
		text(
			{ fontFamily: INTER, fontWeight: 500, fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent ? SIGNAL : TEXT },
			label,
		),
	);
}

/** Tilted "window" holding a product screenshot (its shadow lives in the background SVG). */
function screenshotCard(uri: string): El {
	const bar = 36;
	const dot = (i: number) =>
		box({ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 0 ? 'rgba(255,106,53,0.8)' : 'rgba(255,255,255,0.16)', marginRight: 8 });
	return box(
		{
			position: 'absolute',
			left: CARD_X,
			top: CARD_Y,
			width: CARD_W,
			height: CARD_H,
			transform: `rotate(${CARD_TILT}deg)`,
			borderRadius: 20,
			overflow: 'hidden',
			flexDirection: 'column',
			backgroundColor: SURFACE,
			border: '1px solid rgba(255,255,255,0.16)',
		},
		box(
			{ alignItems: 'center', height: bar, paddingLeft: 16, backgroundColor: '#1b1b1e', borderBottom: `1px solid ${HAIR}` },
			dot(0),
			dot(1),
			dot(2),
		),
		img(uri, { width: CARD_W, height: CARD_H - bar, objectFit: 'cover' }),
	);
}

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

async function toolCard(o: OgOptions, quiz = false): Promise<Card> {
	const [logo, shot] = await Promise.all([logoAsset(o.logo), screenshotAsset(o.screenshot)]);
	const colWidth = shot ? 540 : 760;
	let size = titleSize(o.title, colWidth);
	let lines = estimateLines(o.title, size, colWidth);
	if (lines > 2 && size > 50) {
		size = 50;
		lines = estimateLines(o.title, size, colWidth);
	}
	// Long names: tighten the stack so nothing collides with the footer.
	const compact = lines >= 2;
	const markSize = compact ? 84 : 96;
	const descLines = lines >= 3 ? 1 : 2;
	const pricing = o.pricing ? PRICING_LABEL[o.pricing] ?? o.pricing : undefined;

	const meta: Child[] = [];
	if (pricing) meta.push(pill(pricing, o.pricing === 'free'));
	if (o.rating) meta.push(box({ marginLeft: pricing ? 22 : 0 }, stars(o.rating)));

	const body = box(
		{ flexDirection: 'column', justifyContent: 'center', width: colWidth, flexGrow: 1 },
		mark(o.title, logo, markSize),
		box({ height: compact ? 20 : 28 }),
		title(o.title, size, { width: colWidth, lines: 3 }),
		o.subtitle
			? box({ marginTop: compact ? 12 : 16, width: colWidth }, serifLine(o.subtitle, quiz ? 34 : 30, quiz ? SIGNAL : MUTED, descLines))
			: null,
		meta.length ? box({ marginTop: compact ? 20 : 28, alignItems: 'center' }, ...meta) : null,
	);

	return shot
		? frame({ glow: { x: 0.84, y: 0.5, strength: 0.26 }, cardShadow: true }, [screenshotCard(shot)], o.eyebrow, body)
		: frame({ glow: { x: 0.82, y: 0.55, strength: 0.55 } }, [], o.eyebrow, body);
}

function articleCard(o: OgOptions): Card {
	const size = titleSize(o.title);
	const body = box(
		{ flexDirection: 'column', justifyContent: 'center', flexGrow: 1, width: W - PAD * 2 },
		title(o.title, size, { lines: 3 }),
		o.subtitle
			? box(
					{ marginTop: 26, alignItems: 'center' },
					box({ width: 28, height: 2, backgroundColor: SIGNAL, marginRight: 16 }),
					text({ fontFamily: INTER, fontWeight: 500, fontSize: 24, letterSpacing: '0.01em', color: MUTED, lineClamp: 1, maxWidth: W - PAD * 2 - 44 }, o.subtitle),
				)
			: null,
	);
	return frame({ glow: { x: 0.96, y: 1.0, strength: 0.32 } }, [], o.eyebrow, body);
}

async function vsCard(o: OgOptions): Promise<Card> {
	const left = o.left ?? { name: o.title.split(/\s+vs\.?\s+/i)[0] ?? o.title };
	const right = o.right ?? { name: o.title.split(/\s+vs\.?\s+/i)[1] ?? '' };
	const [la, ra] = await Promise.all([logoAsset(left.logo), logoAsset(right.logo)]);
	const side = (s: OgSide, a: LogoAsset | null) =>
		box(
			{ flexDirection: 'column', alignItems: 'center', width: 400 },
			mark(s.name, a, 148),
			box({ height: 26 }),
			text(
				{ fontFamily: INTER, fontWeight: 600, fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.03em', color: TEXT, textAlign: 'center', width: 400, lineClamp: 2 },
				s.name,
			),
		);
	const body = box(
		{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
		box(
			{ alignItems: 'flex-start', justifyContent: 'center' },
			side(left, la),
			box(
				{ width: 200, height: 148, alignItems: 'center', justifyContent: 'center' },
				text({ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 128, lineHeight: 1, color: SIGNAL, marginTop: -10 }, 'vs'),
			),
			side(right, ra),
		),
		o.subtitle
			? box({ marginTop: 28 }, text({ fontFamily: INTER, fontWeight: 500, fontSize: 22, letterSpacing: '0.01em', color: MUTED, lineClamp: 1, maxWidth: W - PAD * 2 }, o.subtitle))
			: null,
	);
	return frame({ glow: { x: 0.5, y: 0.5, strength: 0.28 } }, [], o.eyebrow ?? 'Head-to-head', body);
}

function categoryCard(o: OgOptions): Card {
	const n = o.title.length;
	const size = n <= 12 ? 136 : n <= 18 ? 112 : n <= 26 ? 92 : 72;
	const body = box(
		{ flexDirection: 'column', justifyContent: 'center', flexGrow: 1, width: W - PAD * 2 },
		title(o.title, size, { lines: 2 }),
		o.subtitle ? box({ marginTop: 18 }, serifLine(o.subtitle, 42, MUTED, 1)) : null,
	);
	return frame({ glow: { x: 0.84, y: 0.58, strength: 0.6 } }, [], o.eyebrow ?? 'AI Tools', body);
}

function newsCard(o: OgOptions): Card {
	const heads = (o.headlines ?? (o.subtitle ? o.subtitle.split(/\s+·\s+/) : [])).slice(0, 3);
	// Editorial brief titles are a full sentence; scale the type to the length so
	// a long title stays on two or three lines instead of clipping.
	const len = (o.title ?? '').length;
	const size = len <= 46 ? 68 : len <= 78 ? 56 : len <= 110 ? 47 : 41;
	const lines = len <= 46 ? 2 : 3;
	const body = box(
		{ flexDirection: 'column', justifyContent: 'center', flexGrow: 1, width: W - PAD * 2 },
		title(o.title, size, { lines }),
		heads.length
			? box(
					{ flexDirection: 'column', marginTop: len > 78 ? 26 : 34, width: W - PAD * 2 },
					...heads.map((h, i) =>
						box(
							{ alignItems: 'center', marginTop: i ? 14 : 0 },
							box({ width: 8, height: 8, borderRadius: 4, backgroundColor: SIGNAL, marginRight: 18, flexShrink: 0 }),
							text({ fontFamily: INTER, fontWeight: 500, fontSize: 26, lineHeight: 1.25, letterSpacing: '-0.01em', color: '#d6d6db', lineClamp: 1, width: W - PAD * 2 - 26 }, h),
						),
					),
				)
			: null,
	);
	return frame({ glow: { x: 1.0, y: 1.0, strength: 0.3 } }, [], o.eyebrow ?? 'Daily brief', body);
}

function siteCard(o: OgOptions): Card {
	const body = box(
		{ flexDirection: 'column', justifyContent: 'center', flexGrow: 1, width: 900 },
		title(o.title, 80, { lines: 2, width: 900 }),
		o.subtitle ? box({ marginTop: 22, width: 820 }, serifLine(o.subtitle, 34, MUTED)) : null,
	);
	return frame({ glow: { x: 0.86, y: 0.6, strength: 0.62 } }, [], o.eyebrow ?? 'AI Briefs', body);
}

async function buildTree(o: OgOptions): Promise<Card> {
	switch (o.kind) {
		case 'tool':
			return toolCard(o);
		case 'quiz':
			return toolCard({ ...o, eyebrow: o.eyebrow ?? 'My AI tool match' }, true);
		case 'article':
			return articleCard(o);
		case 'vs':
			return vsCard(o);
		case 'category':
			return categoryCard(o);
		case 'news':
			return newsCard(o);
		case 'site':
		default:
			return siteCard(o);
	}
}
