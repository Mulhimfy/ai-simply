#!/usr/bin/env node
/**
 * Classify every logo in public/logos as needing a dark tile, a light tile, or
 * neither, and write public/logos/_tiles.json.
 *
 * Why: brand logos are inconsistent. A white-on-transparent mark disappears on a
 * light surface; a near-black mark disappears on a dark one. `ToolLogo.astro`
 * reads this file at build time and paints a contrasting tile behind those marks
 * so a logo is never invisible in either theme.
 *
 * Run after scripts/fetch-logos.mjs: `npm run logo-tiles`
 */
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/logos';
/** alpha-weighted mean luminance above this ⇒ the mark is near-white */
const LIGHT_CUTOFF = 200;
/** …below this ⇒ near-black */
const DARK_CUTOFF = 70;

const files = readdirSync(DIR).filter((f) => f.endsWith('.png'));
const tiles = {};
const counts = { dark: 0, light: 0, none: 0 };

for (const file of files) {
	const { data } = await sharp(join(DIR, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	let lum = 0;
	let weight = 0;
	for (let i = 0; i < data.length; i += 4) {
		const a = data[i + 3];
		if (a < 40) continue; // ignore near-transparent pixels
		const w = a / 255;
		lum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * w;
		weight += w;
	}
	const mean = weight ? lum / weight : 128;
	const tile = mean > LIGHT_CUTOFF ? 'dark' : mean < DARK_CUTOFF ? 'light' : 'none';
	tiles[file.replace(/\.png$/, '')] = tile;
	counts[tile]++;
}

writeFileSync(join(DIR, '_tiles.json'), JSON.stringify(tiles, null, 0) + '\n');
console.log(
	`${files.length} logos classified → ${counts.dark} need a dark tile, ${counts.light} need a light tile, ${counts.none} neutral`,
);
