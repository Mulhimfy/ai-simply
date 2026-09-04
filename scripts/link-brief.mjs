#!/usr/bin/env node
/**
 * Resolve a hand-written brief's sources against that day's snapshot.
 *
 * Write a brief with only the source TITLES filled in (leave `link`, `source` and
 * `date` empty) and run this. It fuzzy-matches each title against
 * `src/data/news/<date>.json` and fills in the real link, outlet and timestamp —
 * so a human editor never types a URL, and a plausible-looking but invented
 * citation cannot slip through. Sources with no match are reported and dropped.
 *
 * Usage:
 *   node scripts/link-brief.mjs 2026-09-02          # fix one day
 *   node scripts/link-brief.mjs --all               # check/repair every brief
 *   node scripts/link-brief.mjs --all --check       # report only, exit 1 on problems
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BRIEFS = 'src/data/briefs';
const NEWS = 'src/data/news';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const all = args.includes('--all');
const dates = all
	? readdirSync(BRIEFS).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''))
	: args.filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

if (!dates.length) {
	console.error('Usage: node scripts/link-brief.mjs <YYYY-MM-DD> | --all [--check]');
	process.exit(2);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** token-overlap similarity, robust to punctuation and smart quotes */
function similarity(a, b) {
	const A = new Set(norm(a).split(' ').filter((w) => w.length > 2));
	const B = new Set(norm(b).split(' ').filter((w) => w.length > 2));
	if (!A.size || !B.size) return 0;
	let shared = 0;
	for (const w of A) if (B.has(w)) shared++;
	return shared / Math.min(A.size, B.size);
}

let problems = 0;
let repaired = 0;

for (const date of dates) {
	const briefPath = join(BRIEFS, `${date}.json`);
	const snapPath = join(NEWS, `${date}.json`);
	if (!existsSync(briefPath)) { console.log(`${date}: no brief`); continue; }
	if (!existsSync(snapPath)) { console.log(`${date}: no snapshot — cannot verify sources`); problems++; continue; }

	const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
	const items = JSON.parse(readFileSync(snapPath, 'utf8')).items;
	const byLink = new Map(items.map((i) => [i.link, i]));

	let changed = 0;
	let dropped = 0;
	for (const item of brief.items ?? []) {
		const out = [];
		for (const src of item.sources ?? []) {
			// already correct?
			if (src.link && byLink.has(src.link)) {
				const real = byLink.get(src.link);
				if (src.title !== real.title || src.source !== real.source || src.date !== real.date) {
					out.push({ title: real.title, link: real.link, source: real.source, date: real.date });
					changed++;
				} else out.push(src);
				continue;
			}
			// resolve by title
			let best = null;
			let bestScore = 0;
			for (const cand of items) {
				const s = similarity(src.title ?? '', cand.title);
				if (s > bestScore) { bestScore = s; best = cand; }
			}
			if (best && bestScore >= 0.6) {
				out.push({ title: best.title, link: best.link, source: best.source, date: best.date });
				changed++;
			} else {
				console.log(`  ${date}: no snapshot match for "${(src.title ?? '').slice(0, 64)}" — dropped`);
				dropped++;
				problems++;
			}
		}
		item.sources = out;
	}
	brief.items = (brief.items ?? []).filter((i) => i.sources.length);

	if (changed || dropped) {
		if (checkOnly) {
			console.log(`${date}: ${changed} source(s) would be corrected, ${dropped} dropped`);
			problems += changed ? 0 : 0;
		} else {
			writeFileSync(briefPath, JSON.stringify(brief, null, 2) + '\n');
			console.log(`${date}: ${changed} source(s) resolved, ${dropped} dropped`);
			repaired++;
		}
	} else {
		console.log(`${date}: all sources already match the snapshot`);
	}
}

if (!checkOnly) console.log(`\n${repaired} brief(s) updated`);
process.exit(problems && checkOnly ? 1 : 0);
