#!/usr/bin/env node
/**
 * write-brief.mjs — turn a raw RSS snapshot into the day's editorial brief.
 *
 * The Brief is the product (see docs/REBUILD.md, "THE PRODUCT"). Every day has a brief:
 * either an editorial one in `src/data/briefs/YYYY-MM-DD.json`, or the deterministic
 * `autoBrief` fallback derived from the snapshot. This script writes the editorial one —
 * it reads `src/data/news/<date>.json`, pre-clusters the headlines the same way
 * `src/lib/brief.ts` does, and asks Claude to write the day's brief against a JSON schema
 * that can only produce a valid `EditorialBrief`.
 *
 * Usage:
 *   node scripts/write-brief.mjs                    # newest snapshot in src/data/news/
 *   node scripts/write-brief.mjs --date 2026-09-01
 *   node scripts/write-brief.mjs --force            # overwrite an existing brief
 *   node scripts/write-brief.mjs --dry-run          # print the prompt + schema, call nothing
 *
 * Without ANTHROPIC_API_KEY the script prints a notice and exits 0, so the daily workflow
 * and the site build never depend on it — days without a brief fall back to `autoBrief`.
 *
 * The clustering below is re-implemented from `src/lib/brief.ts` on purpose: this script is
 * plain ESM and must not import TypeScript. `keywords()` comes from `src/utils/news.mjs`,
 * which is already plain JS and is the shared definition both layers use.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { keywords } from '../src/utils/news.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NEWS_DIR = join(ROOT, 'src', 'data', 'news');
const BRIEFS_DIR = join(ROOT, 'src', 'data', 'briefs');
const TOOLS_DIR = join(ROOT, 'src', 'content', 'tools');
const REFERENCE_BRIEF = join(BRIEFS_DIR, '2026-09-02.json');

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 16000;

// ── the seven angles (mirrors ANGLES / ANGLE_HINTS in src/lib/brief.ts) ────────────────────

const ANGLES = {
	work: 'Your work — jobs, skills and the office',
	money: 'Money — deals, funding, pricing, markets',
	creators: 'Creators — writing, images, video, music',
	builders: 'Builders — models, APIs, developer tools',
	everyday: 'Everyday life — phones, homes, health, learning',
	policy: 'Rules & power — regulation, safety, big tech',
	science: 'Research — papers, breakthroughs, benchmarks',
};
const ANGLE_KEYS = Object.keys(ANGLES);

const ANGLE_HINTS = {
	work: ['job', 'jobs', 'hiring', 'layoff', 'layoffs', 'worker', 'workers', 'office', 'productivity', 'employee', 'employees', 'career', 'skills', 'workplace', 'enterprise', 'agent', 'agents', 'copilot'],
	money: ['funding', 'raises', 'raised', 'valuation', 'unicorn', 'ipo', 'revenue', 'billion', 'million', 'acquire', 'acquires', 'acquisition', 'deal', 'price', 'pricing', 'subscription', 'stock', 'shares', 'investors', 'startup', 'startups'],
	creators: ['image', 'images', 'video', 'videos', 'music', 'film', 'hollywood', 'studio', 'studios', 'artists', 'artist', 'writing', 'writers', 'creative', 'photo', 'photos', 'design', 'voice', 'podcast', 'youtube', 'tiktok', 'deepfake', 'deepfakes'],
	builders: ['model', 'models', 'open', 'source', 'api', 'developer', 'developers', 'code', 'coding', 'github', 'llm', 'gpu', 'gpus', 'chip', 'chips', 'nvidia', 'inference', 'training', 'benchmark', 'hugging', 'weights', 'llama', 'gemini', 'claude', 'gpt'],
	everyday: ['phone', 'iphone', 'android', 'home', 'car', 'cars', 'health', 'doctor', 'kids', 'school', 'students', 'teacher', 'teachers', 'learning', 'shopping', 'search', 'browser', 'assistant', 'siri', 'alexa', 'glasses', 'wearable', 'consumer', 'users', 'app', 'apps'],
	policy: ['regulation', 'regulators', 'law', 'laws', 'lawsuit', 'sues', 'sued', 'court', 'ban', 'bans', 'government', 'senate', 'congress', 'eu', 'uk', 'china', 'safety', 'privacy', 'copyright', 'antitrust', 'ftc', 'election', 'military', 'pentagon', 'surveillance', 'policy'],
	science: ['research', 'researchers', 'study', 'paper', 'scientists', 'science', 'breakthrough', 'discovery', 'physics', 'biology', 'protein', 'drug', 'medicine', 'quantum', 'robot', 'robots', 'robotics', 'brain', 'neural'],
};

/** Best-guess angle for a headline — a hint for the model, not a decision. */
function angleFor(title) {
	const kw = keywords(title);
	const words = new Set([...kw, ...title.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)]);
	let best = 'everyday';
	let bestScore = 0;
	for (const [angle, hints] of Object.entries(ANGLE_HINTS)) {
		let s = 0;
		for (const h of hints) if (words.has(h)) s++;
		if (s > bestScore) { bestScore = s; best = angle; }
	}
	return best;
}

/** Cluster a day's headlines by keyword overlap (Jaccard >= 0.34 or >= 3 shared keywords). */
function cluster(items) {
	const kws = items.map((i) => keywords(i.title));
	const groups = [];
	const assigned = new Array(items.length).fill(-1);
	for (let i = 0; i < items.length; i++) {
		if (assigned[i] >= 0) continue;
		const g = [i];
		assigned[i] = groups.length;
		for (let j = i + 1; j < items.length; j++) {
			if (assigned[j] >= 0) continue;
			let shared = 0;
			for (const k of kws[i]) if (kws[j].has(k)) shared++;
			const union = kws[i].size + kws[j].size - shared;
			const jac = union ? shared / union : 0;
			if (jac >= 0.34 || shared >= 3) { g.push(j); assigned[j] = groups.length; }
		}
		groups.push(g);
	}
	return groups.map((g) => g.map((i) => items[i]));
}

function parseDate(d) { const t = new Date(d).getTime(); return Number.isNaN(t) ? 0 : t; }

/** Clusters ordered the way autoBrief orders them: widest coverage first, then most recent. */
function rankedClusters(items) {
	return cluster(items)
		.map((g) => ({ items: g, coverage: new Set(g.map((x) => x.source)).size, newest: Math.max(...g.map((x) => parseDate(x.date))) }))
		.sort((a, b) => b.coverage - a.coverage || b.newest - a.newest);
}

// ── inputs ────────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
	const args = { date: null, force: false, dryRun: false };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--force') args.force = true;
		else if (a === '--dry-run' || a === '--dry') args.dryRun = true;
		else if (a === '--date') args.date = argv[++i];
		else if (a.startsWith('--date=')) args.date = a.slice('--date='.length);
		else if (a === '--help' || a === '-h') args.help = true;
		else throw new Error(`Unknown argument: ${a}`);
	}
	if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
		throw new Error(`--date must be YYYY-MM-DD, got "${args.date}"`);
	}
	return args;
}

async function newestSnapshotDate() {
	const files = (await readdir(NEWS_DIR)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
	if (!files.length) throw new Error(`No snapshots in ${NEWS_DIR}. Run scripts/fetch-news.mjs first.`);
	return files[files.length - 1].replace(/\.json$/, '');
}

/** Pull the frontmatter block out of a markdown file. */
function frontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	return match ? match[1] : '';
}

/** Read a scalar key from a frontmatter block, tolerating quotes. */
function field(fm, key) {
	const match = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
	if (!match) return null;
	return match[1].trim().replace(/^['"]|['"]$/g, '') || null;
}

/** Read an inline list key (`tags: [a, b]`) from a frontmatter block. */
function listField(fm, key) {
	const raw = field(fm, key);
	if (!raw || !raw.startsWith('[')) return [];
	return raw.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

/** Every tool the brief is allowed to recommend, from src/content/tools/*.md frontmatter. */
async function loadTools() {
	const files = (await readdir(TOOLS_DIR)).filter((f) => f.endsWith('.md')).sort();
	const tools = [];
	for (const file of files) {
		const fm = frontmatter(await readFile(join(TOOLS_DIR, file), 'utf8'));
		if (!fm) continue;
		tools.push({
			slug: file.replace(/\.md$/, ''),
			name: field(fm, 'name') ?? file.replace(/\.md$/, ''),
			category: field(fm, 'category') ?? '',
			tags: listField(fm, 'tags'),
		});
	}
	return tools;
}

// ── prompt ────────────────────────────────────────────────────────────────────────────────

const STYLE_RULES = `Voice and rules (from the product brief — follow them exactly):
- You are a smart friend who reads everything so the reader doesn't have to. Confident, specific, short.
- Plain English. Write for a curious person who does not work in AI. No jargon; if a term is unavoidable, explain it in the same breath.
- Sentence case everywhere, including the brief title and every headline. Never Title Case.
- No hype. Banned: "revolutionary", "game-changing", "groundbreaking", "unleash", "seismic", "the future of", "explained simply", "best AI tools".
- No hedging filler ("it remains to be seen", "only time will tell", "in today's fast-moving world").
- Concrete over abstract: names, numbers, dates, prices. If a number is in the sources, use it.
- Never invent a fact, a quote, a number or a URL. Everything you assert must be supported by the snapshot headlines you cite.
- The reader's question is always "so what, for me?". Answer it in every item.`;

const TASK_RULES = `Write today's brief.

Shape:
- "title": the whole day in one line, <= 110 characters, sentence case. Name the two or three things
  that actually happened, joined with commas or "and" — like the reference example. Not a label
  ("AI news roundup"), not a question, no colon-subtitle.
- "intro": one or two sentences. The lede — the thread that ties the day together. It should make
  someone want to read on without repeating the headlines verbatim.
- "items": 5 or 6 stories, most consequential first. Use the pre-clustered groups below as your
  candidate stories — a cluster covered by several outlets is usually a bigger story than a
  single-outlet one, but your judgement about what matters to a normal person wins over coverage
  count. Skip clusters that are press releases, product-marketing posts or pure inside-baseball.
  The clustering is deliberately conservative, so two clusters sometimes describe the same event
  from different angles — merge those into one item and cite every outlet. Never merge stories
  that are genuinely different just because they share a company name.
- Each item:
  - "headline": <= 90 characters, plain English, sentence case. Rewrite the outlet's headline into
    what actually happened — do not copy a source headline verbatim, and do not use outlet
    clickbait phrasing.
  - "why": exactly two sentences. Sentence one: what changed. Sentence two: why it matters to a
    normal person. No restating the headline.
  - "action": one sentence — what the reader should do, try, watch for, or stop worrying about.
    "Nothing to do today" plus what to watch for is a legitimate action; a vague "stay informed" is not.
  - "angle": exactly one of the seven angle keys. Vary them across the brief — at most two items
    sharing an angle.
  - "tools": 0, 1 or 2 slugs, chosen ONLY from the allowed tool list. Pick a tool a reader could
    genuinely open because of this story. When nothing fits, use an empty array — an irrelevant
    tool is worse than none.
  - "sources": the snapshot items behind this story, copied verbatim (title, link, source, date)
    from the snapshot below. Never invent, edit, shorten or merge a source. Every link you emit
    must appear in the snapshot exactly as written. Use every outlet from the cluster you picked.
- Do not reuse the same snapshot item in two different items.`;

function renderSnapshot(snapshot) {
	return snapshot.items
		.map((it, i) => `[${i + 1}] ${it.title}\n    source: ${it.source}\n    date: ${it.date}\n    link: ${it.link}`)
		.join('\n');
}

function renderClusters(clusters, snapshot) {
	const index = new Map(snapshot.items.map((it, i) => [it.link, i + 1]));
	return clusters
		.map((c, i) => {
			const refs = c.items.map((it) => `[${index.get(it.link)}]`).join(' ');
			const outlets = [...new Set(c.items.map((it) => it.source))].join(', ');
			return `Cluster ${i + 1} — ${c.coverage} outlet${c.coverage === 1 ? '' : 's'} (${outlets}) — suggested angle: ${angleFor(c.items[0].title)}\n  ${refs} ${c.items[0].title}`;
		})
		.join('\n');
}

function renderTools(tools) {
	return tools.map((t) => `${t.slug} — ${t.name}${t.category ? ` (${t.category})` : ''}${t.tags.length ? ` [${t.tags.join(', ')}]` : ''}`).join('\n');
}

function renderExamples(reference) {
	const picks = reference.items.slice(0, 2);
	return picks.map((it) => JSON.stringify(it, null, 2)).join('\n\n');
}

function buildPrompt({ snapshot, clusters, tools, reference, date }) {
	const readable = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
		weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
	});

	const system = `You write the daily brief for AI Briefs (getaibriefs.com).

The product is not a tools directory and not "AI explained simply". It is a daily 3-minute brief:
what changed in AI today, why it matters to you, and what to do about it. The promise on every
surface is "Know what matters. In 3 minutes. Every day."

${STYLE_RULES}

The seven angles (one per item, the key is what you emit):
${ANGLE_KEYS.map((k) => `- ${k}: ${ANGLES[k]}`).join('\n')}`;

	const user = `Today is ${readable} (${date}).

${TASK_RULES}

## Today's snapshot — ${snapshot.items.length} headlines from ${new Set(snapshot.items.map((i) => i.source)).size} outlets

These are the ONLY facts you have and the ONLY sources you may cite. Copy source fields verbatim.

${renderSnapshot(snapshot)}

## Pre-clustered stories (same clustering the site's fallback brief uses)

Ordered by how many outlets covered them, then recency. Treat this as a starting point, not an order.

${renderClusters(clusters, snapshot)}

## Allowed tool slugs (${tools.length}) — "tools" may only contain slugs from this list

${renderTools(tools)}

## Two items from a brief that got it right (${reference.date}) — match this quality and voice

${renderExamples(reference)}

Now write the brief for ${date}. Emit JSON matching the required schema and nothing else.`;

	return { system, user };
}

function buildSchema({ tools, snapshot }) {
	const slugs = tools.map((t) => t.slug);
	const links = [...new Set(snapshot.items.map((i) => i.link))];
	return {
		type: 'object',
		additionalProperties: false,
		required: ['date', 'title', 'intro', 'items'],
		properties: {
			date: { type: 'string', description: 'The brief date, YYYY-MM-DD.', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
			title: { type: 'string', description: 'The whole day in one sentence-case line, max 110 characters.', maxLength: 110 },
			intro: { type: 'string', description: 'One or two sentences: the lede that ties the day together.' },
			items: {
				type: 'array',
				description: '5 or 6 stories, most consequential first.',
				minItems: 5,
				maxItems: 6,
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['headline', 'why', 'action', 'angle', 'tools', 'sources'],
					properties: {
						headline: { type: 'string', description: 'Plain-English sentence-case headline, max 90 characters.', maxLength: 90 },
						why: { type: 'string', description: 'Exactly two sentences: what changed, then why it matters to a normal person.' },
						action: { type: 'string', description: 'One sentence: what the reader should do, try or watch for.' },
						angle: { type: 'string', description: 'Who this affects.', enum: ANGLE_KEYS },
						tools: {
							type: 'array',
							description: '0-2 tool slugs from the allowed list; empty when nothing fits.',
							maxItems: 2,
							items: { type: 'string', enum: slugs },
						},
						sources: {
							type: 'array',
							description: 'Snapshot items behind this story, copied verbatim.',
							minItems: 1,
							items: {
								type: 'object',
								additionalProperties: false,
								required: ['title', 'link', 'source', 'date'],
								properties: {
									title: { type: 'string' },
									link: { type: 'string', enum: links },
									source: { type: 'string' },
									date: { type: 'string' },
								},
							},
						},
					},
				},
			},
		},
	};
}

// ── validation ────────────────────────────────────────────────────────────────────────────

function countSentences(s) {
	return (String(s).trim().match(/[.!?]+(?=\s|$)/g) ?? []).length || (s.trim() ? 1 : 0);
}

/**
 * Hard-validate the model's output against the snapshot and the tool list, and canonicalise
 * every source object from the snapshot so the stored titles/dates are byte-identical to what
 * was fetched. Returns { brief, errors, warnings }.
 */
function validate(raw, { snapshot, tools, date }) {
	const errors = [];
	const warnings = [];
	const byLink = new Map(snapshot.items.map((i) => [i.link, i]));
	const slugs = new Set(tools.map((t) => t.slug));

	if (!raw || typeof raw !== 'object') return { brief: null, errors: ['Response was not a JSON object.'], warnings };

	const brief = { date, title: String(raw.title ?? '').trim(), intro: String(raw.intro ?? '').trim(), items: [] };

	if (!brief.title) errors.push('Missing "title".');
	else if (brief.title.length > 110) errors.push(`"title" is ${brief.title.length} characters, the limit is 110: "${brief.title}"`);
	if (!brief.intro) errors.push('Missing "intro".');
	else if (countSentences(brief.intro) > 2) warnings.push(`"intro" reads as ${countSentences(brief.intro)} sentences; 1–2 were asked for.`);

	const items = Array.isArray(raw.items) ? raw.items : [];
	if (items.length < 5 || items.length > 6) errors.push(`Expected 5 or 6 items, got ${items.length}.`);

	const seenLinks = new Set();
	const angleCounts = new Map();

	items.forEach((it, n) => {
		const at = `items[${n}]`;
		const headline = String(it?.headline ?? '').trim();
		const why = String(it?.why ?? '').trim();
		const action = String(it?.action ?? '').trim();

		if (!headline) errors.push(`${at}: missing "headline".`);
		else if (headline.length > 90) errors.push(`${at}: "headline" is ${headline.length} characters, the limit is 90: "${headline}"`);
		if (!why) errors.push(`${at}: missing "why".`);
		else if (countSentences(why) !== 2) warnings.push(`${at}: "why" reads as ${countSentences(why)} sentences; exactly 2 were asked for.`);
		if (!action) errors.push(`${at}: missing "action".`);
		else if (countSentences(action) > 1) warnings.push(`${at}: "action" reads as ${countSentences(action)} sentences; 1 was asked for.`);

		if (!ANGLE_KEYS.includes(it?.angle)) errors.push(`${at}: "angle" must be one of ${ANGLE_KEYS.join(', ')} — got ${JSON.stringify(it?.angle)}.`);
		else angleCounts.set(it.angle, (angleCounts.get(it.angle) ?? 0) + 1);

		const toolList = Array.isArray(it?.tools) ? it.tools : [];
		if (toolList.length > 2) errors.push(`${at}: "tools" has ${toolList.length} entries, the limit is 2.`);
		for (const slug of toolList) {
			if (!slugs.has(slug)) errors.push(`${at}: tool slug "${slug}" does not exist in src/content/tools/.`);
		}

		const srcList = Array.isArray(it?.sources) ? it.sources : [];
		if (!srcList.length) errors.push(`${at}: "sources" is empty — every item must cite the snapshot.`);
		const sources = [];
		for (const s of srcList) {
			const link = String(s?.link ?? '').trim();
			const snap = byLink.get(link);
			if (!snap) {
				errors.push(`${at}: source link is not in today's snapshot (invented or edited): ${link || '(empty)'}`);
				continue;
			}
			if (seenLinks.has(link)) warnings.push(`${at}: source ${link} was already used by an earlier item.`);
			seenLinks.add(link);
			if (s.title !== snap.title || s.source !== snap.source || s.date !== snap.date) {
				warnings.push(`${at}: source fields for ${link} were rewritten; restored verbatim from the snapshot.`);
			}
			// Always store the snapshot's own strings — sources are verbatim by construction.
			sources.push({ title: snap.title, link: snap.link, source: snap.source, date: snap.date });
		}

		brief.items.push({ headline, why, action, angle: it?.angle, tools: toolList, sources });
	});

	for (const [angle, n] of angleCounts) {
		if (n > 2) warnings.push(`angle "${angle}" is used by ${n} items; at most 2 were asked for.`);
	}

	return { brief, errors, warnings };
}

// ── the call ──────────────────────────────────────────────────────────────────────────────

function textOf(message) {
	return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function printUsage(label, usage) {
	if (!usage) return;
	const parts = [
		`input ${usage.input_tokens ?? 0}`,
		`output ${usage.output_tokens ?? 0}`,
	];
	if (usage.cache_read_input_tokens) parts.push(`cache read ${usage.cache_read_input_tokens}`);
	if (usage.cache_creation_input_tokens) parts.push(`cache write ${usage.cache_creation_input_tokens}`);
	console.log(`Tokens (${label}): ${parts.join(', ')}`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		console.log('Usage: node scripts/write-brief.mjs [--date YYYY-MM-DD] [--force] [--dry-run]');
		return;
	}

	const date = args.date ?? (await newestSnapshotDate());
	const snapshotPath = join(NEWS_DIR, `${date}.json`);
	const outPath = join(BRIEFS_DIR, `${date}.json`);

	if (!existsSync(snapshotPath)) {
		console.error(`No snapshot at ${snapshotPath}. Run scripts/fetch-news.mjs first.`);
		process.exit(1);
	}
	if (existsSync(outPath) && !args.force) {
		console.log(`Brief for ${date} already exists at ${outPath} — nothing to do (use --force to overwrite).`);
		return;
	}

	const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
	if (!Array.isArray(snapshot.items) || !snapshot.items.length) {
		console.error(`Snapshot ${snapshotPath} has no items — refusing to write a brief.`);
		process.exit(1);
	}

	const tools = await loadTools();
	const reference = JSON.parse(await readFile(REFERENCE_BRIEF, 'utf8'));
	const clusters = rankedClusters(snapshot.items);
	const { system, user } = buildPrompt({ snapshot, clusters, tools, reference, date });
	const schema = buildSchema({ tools, snapshot });

	if (args.dryRun) {
		console.log(`--- dry run: ${date} — ${snapshot.items.length} headlines, ${clusters.length} clusters, ${tools.length} tools ---\n`);
		console.log('=== SYSTEM ===\n');
		console.log(system);
		console.log('\n=== USER ===\n');
		console.log(user);
		console.log('\n=== OUTPUT SCHEMA ===\n');
		console.log(JSON.stringify(schema, null, 2));
		console.log(`\n--- dry run complete: no API call made, ${outPath} not written ---`);
		return;
	}

	if (!process.env.ANTHROPIC_API_KEY) {
		console.log('ANTHROPIC_API_KEY is not set — skipping the editorial brief for ' + date + '.');
		console.log('The site falls back to the automatic brief built from the snapshot, so the build is unaffected.');
		console.log('To write it: export ANTHROPIC_API_KEY=... && npm run write-brief');
		return;
	}

	const client = new Anthropic();
	const messages = [{ role: 'user', content: user }];
	let result = null;
	let attempt = 0;

	while (attempt < 2) {
		attempt++;
		let response;
		try {
			response = await client.messages.create({
				model: MODEL,
				max_tokens: MAX_TOKENS,
				system,
				messages,
				thinking: { type: 'adaptive' },
				output_config: { effort: 'high', format: { type: 'json_schema', schema } },
			});
		} catch (error) {
			if (error instanceof Anthropic.APIError) {
				console.error(`Anthropic API error ${error.status ?? ''}: ${error.message}`);
			} else {
				console.error(error);
			}
			process.exit(1);
		}

		printUsage(`attempt ${attempt}`, response.usage);

		if (response.stop_reason === 'refusal') {
			console.error(`The model declined to write the brief (${response.stop_details?.category ?? 'no category'}). Not writing a file.`);
			process.exit(1);
		}
		if (response.stop_reason === 'max_tokens') {
			console.error(`Response hit max_tokens (${MAX_TOKENS}) and is truncated. Not writing a file.`);
			process.exit(1);
		}

		const text = textOf(response);
		let parsed = null;
		let parseError = null;
		try {
			parsed = JSON.parse(text);
		} catch (error) {
			parseError = `Your response was not valid JSON: ${error.message}`;
		}

		const check = parsed ? validate(parsed, { snapshot, tools, date }) : { brief: null, errors: [parseError], warnings: [] };

		if (!check.errors.length) {
			for (const w of check.warnings) console.warn(`Warning: ${w}`);
			result = check.brief;
			break;
		}

		console.warn(`Attempt ${attempt} produced an invalid brief:`);
		for (const e of check.errors) console.warn(`  - ${e}`);
		if (attempt >= 2) {
			console.error('Retry also failed validation — not writing a file. The site falls back to the automatic brief.');
			process.exit(1);
		}

		console.warn('Retrying once with the errors fed back...');
		messages.push({ role: 'assistant', content: text });
		messages.push({
			role: 'user',
			content: `That brief failed validation. Fix every problem below and re-emit the complete brief as JSON — same schema, nothing else.\n\n${check.errors.map((e) => `- ${e}`).join('\n')}\n\nReminder: source objects must be copied verbatim from the snapshot above, and tool slugs must come from the allowed list.`,
		});
	}

	await mkdir(BRIEFS_DIR, { recursive: true });
	await writeFile(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
	console.log(`Wrote ${outPath} — ${result.items.length} items, angles: ${result.items.map((i) => i.angle).join(', ')}.`);
	console.log(`Title: ${result.title}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
