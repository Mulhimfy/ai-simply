#!/usr/bin/env node
/**
 * Post-build contract verification for getaibriefs.com.
 * Run after `npm run build`: `node scripts/verify-contracts.mjs`
 * Exits 1 on any FAIL. Checks the MUST PRESERVE list from docs/REBUILD.md:
 * routes, noindex gating, JSON-LD types, monetization hooks, SEO basics, and
 * design-system hygiene (no emoji UI, no third-party favicon hotlinks).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const fails = [];
const warns = [];
const passes = [];
const ok = (m) => passes.push(m);
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

function html(p) {
	const f = join(DIST, p.replace(/^\//, ''), 'index.html');
	return existsSync(f) ? readFileSync(f, 'utf8') : null;
}
function fm(file) {
	const raw = readFileSync(file, 'utf8');
	const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
	const out = {};
	if (!m) return out;
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (kv) out[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
	}
	return out;
}
const toSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const noindex = (h) => /<meta name="robots" content="noindex/i.test(h);
const hasLd = (h, type) => new RegExp(`"@type":\\s*"${type}"|"@type":\\s*\\[[^\\]]*"${type}"`).test(h);

// ── content inventory ────────────────────────────────────────────────────────
const toolFiles = readdirSync('src/content/tools').filter((f) => f.endsWith('.md'));
const tools = toolFiles.map((f) => ({ slug: f.replace(/\.md$/, ''), ...fm(join('src/content/tools', f)) }));
const posts = readdirSync('src/content/blog').filter((f) => /\.mdx?$/.test(f)).map((f) => ({ slug: f.replace(/\.mdx?$/, ''), ...fm(join('src/content/blog', f)) }));
const newsDays = readdirSync('src/data/news').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const consts = readFileSync('src/consts.ts', 'utf8');
// Only the TOOL_CATEGORIES block — DEFAULT_AUTHOR also has a `slug:` field.
const catBlock = consts.slice(consts.indexOf('export const TOOL_CATEGORIES'), consts.indexOf('export const SUBCATEGORY_INTROS'));
const catSlugs = [...catBlock.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
// Subcategory pages exist only for names listed in the taxonomy (mirrors getStaticPaths).
const taxonomySubs = new Set([...catBlock.matchAll(/subcategories:\s*\[([^\]]*)\]/g)]
	.flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])));

// ── 1. routes ───────────────────────────────────────────────────────────────
const expected = ['/', '/tools/', '/tools/new/', '/tools/top-rated/', '/tools/collections/', '/tools/quiz/', '/tools/vs/', '/tools/alternatives/',
	'/blog/', '/news/', '/reviews/', '/tutorials/', '/author/', '/author/ai-briefs/', '/submit/', '/submit/success/', '/pricing/',
	'/rating-methodology/', '/about/', '/contact/', '/privacy/', '/terms/', '/proxy/', '/saved/'];
for (const t of tools) expected.push(`/tools/${t.slug}/`, `/tools/alternatives/${t.slug}/`);
for (const p of posts) expected.push(`/blog/${p.slug}/`);
for (const c of catSlugs) expected.push(`/tools/category/${c}/`);
for (const d of newsDays) expected.push(`/news/${d}/`);
const subcats = new Map();
const orphanSubs = new Map(); // frontmatter subcategories absent from the taxonomy → no page is generated
const tags = new Set();
for (const t of tools) {
	if (t.category && t.subcategory) {
		if (taxonomySubs.has(t.subcategory)) {
			const k = `/tools/category/${t.category}/${toSlug(t.subcategory)}/`;
			subcats.set(k, (subcats.get(k) ?? 0) + 1);
		} else {
			orphanSubs.set(t.subcategory, (orphanSubs.get(t.subcategory) ?? 0) + 1);
		}
	}
	const tm = t.tags?.match(/\[(.*)\]/); if (tm) tm[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).forEach((x) => tags.add(toSlug(x)));
}
for (const k of subcats.keys()) expected.push(k);
for (const tg of tags) expected.push(`/tools/tag/${tg}/`);
if (orphanSubs.size) warn(`${orphanSubs.size} tool subcategories are not in TOOL_CATEGORIES, so they get no page: ${[...orphanSubs.keys()].slice(0, 6).join(', ')}${orphanSubs.size > 6 ? ' …' : ''}`);
const blogCats = new Set(posts.map((p) => p.category).filter(Boolean));
for (const c of blogCats) expected.push(`/blog/category/${c}/`);
const bySub = {};
for (const t of tools) (bySub[t.subcategory || t.category] ??= []).push(t);
const vsPairs = [];
for (const g of Object.values(bySub)) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) vsPairs.push({ a: g[i], b: g[j], slug: `${g[i].slug}-vs-${g[j].slug}` });
for (const v of vsPairs) expected.push(`/tools/vs/${v.slug}/`);

let missing = 0;
for (const r of expected) if (!html(r)) { missing++; if (missing <= 15) fail(`route missing: ${r}`); }
if (missing > 15) fail(`… and ${missing - 15} more missing routes`);
if (!missing) ok(`all ${expected.length} expected routes exist`);
for (const f of ['404.html', 'rss.xml', 'sitemap-index.xml', 'sitemap-0.xml', 'search-index.json', 'og/default.png', 'robots.txt', 'favicon.svg', 'favicon.ico'])
	existsSync(join(DIST, f)) ? ok(`file ${f}`) : fail(`file missing: ${f}`);

// ── 1b. taxonomy integrity ──────────────────────────────────────────────────
const catSubs = new Map();
for (const m of catBlock.matchAll(/slug:\s*'([a-z-]+)',[\s\S]*?subcategories:\s*\[([^\]]*)\]/g))
	catSubs.set(m[1], [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]));
let taxErr = 0;
for (const t of tools) {
	if (!t.subcategory) continue;
	if (!catSubs.get(t.category)?.includes(t.subcategory)) {
		taxErr++;
		if (taxErr <= 5) fail(`taxonomy: ${t.slug} has subcategory "${t.subcategory}" which is not listed under category "${t.category}" — no subcategory page is generated for it`);
	}
}
if (!taxErr) ok(`all ${tools.filter((t) => t.subcategory).length} tool subcategories exist in their category's taxonomy`);

// ── 1c. brief integrity ─────────────────────────────────────────────────────
// Every editorial brief must cite only links that exist in that day's snapshot,
// use a real angle, and reference real tool slugs. Invented citations are the
// worst failure this site could ship.
const ANGLES = new Set(['work', 'money', 'creators', 'builders', 'everyday', 'policy', 'science']);
const toolSlugs = new Set(tools.map((t) => t.slug));
let briefErr = 0;
for (const f of (existsSync('src/data/briefs') ? readdirSync('src/data/briefs') : []).filter((x) => x.endsWith('.json'))) {
	const date = f.replace('.json', '');
	const brief = JSON.parse(readFileSync(join('src/data/briefs', f), 'utf8'));
	const snapPath = join('src/data/news', f);
	const snapLinks = existsSync(snapPath) ? new Set(JSON.parse(readFileSync(snapPath, 'utf8')).items.map((i) => i.link)) : null;
	for (const item of brief.items ?? []) {
		if (!ANGLES.has(item.angle)) { fail(`brief ${date}: invalid angle "${item.angle}"`); briefErr++; }
		for (const t of item.tools ?? []) if (!toolSlugs.has(t)) { fail(`brief ${date}: unknown tool slug "${t}"`); briefErr++; }
		if (snapLinks) for (const src of item.sources ?? []) {
			if (!snapLinks.has(src.link)) { fail(`brief ${date}: cites a link that is not in that day's snapshot — ${src.link}`); briefErr++; }
		}
		if (!item.headline || !item.why) { fail(`brief ${date}: item missing headline or why`); briefErr++; }
	}
}
if (!briefErr) ok('every editorial brief cites only real snapshot links, real angles and real tools');

// ── 2. noindex gating ───────────────────────────────────────────────────────
const check = (route, shouldNoindex, label) => {
	const h = html(route); if (!h) return;
	const is = noindex(h);
	if (is === shouldNoindex) ok(`${label}: ${route} ${shouldNoindex ? 'noindex' : 'indexable'}`);
	else fail(`${label}: ${route} expected ${shouldNoindex ? 'noindex' : 'indexable'}`);
};
check(`/tools/alternatives/${tools[0].slug}/`, true, 'alternatives');
check('/tools/alternatives/', false, 'alternatives hub');
check(`/tools/tag/${[...tags][0]}/`, true, 'tag');
check(`/news/${newsDays[newsDays.length - 1]}/`, true, 'dated news');
check('/news/', false, 'news hub');
check('/submit/success/', true, 'submit success');
check('/saved/', true, 'saved');
check('/tools/vs/', false, 'vs hub');
const rated = new Set(tools.filter((t) => t.rating).map((t) => t.slug));
const ratedPair = vsPairs.find((v) => rated.has(v.a.slug) && rated.has(v.b.slug));
const unratedPair = vsPairs.find((v) => !(rated.has(v.a.slug) && rated.has(v.b.slug)));
if (ratedPair) check(`/tools/vs/${ratedPair.slug}/`, false, 'vs rated pair');
if (unratedPair) check(`/tools/vs/${unratedPair.slug}/`, true, 'vs unrated pair');
const thin = [...subcats.entries()].find(([, n]) => n < 3);
const fat = [...subcats.entries()].find(([, n]) => n >= 3);
if (thin) check(thin[0], true, 'thin subcategory');
if (fat) check(fat[0], false, 'subcategory');
check('/', false, 'home'); check('/tools/', false, 'tools'); check(`/tools/${tools[0].slug}/`, false, 'tool');

// ── 3. sitemap ──────────────────────────────────────────────────────────────
const sm = existsSync(join(DIST, 'sitemap-0.xml')) ? readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8') : '';
for (const bad of ['/tools/tag/', '/submit/success/', '/saved/', `/news/${newsDays[0]}/`]) sm.includes(bad) ? fail(`sitemap contains ${bad}`) : ok(`sitemap excludes ${bad}`);
for (const good of ['/tools/vs/</loc>', '/tools/alternatives/</loc>', '/news/</loc>', `/tools/${tools[0].slug}/`]) sm.includes(good) ? ok(`sitemap has ${good}`) : fail(`sitemap missing ${good}`);
if (thin && sm.includes(thin[0])) fail(`sitemap contains thin subcategory ${thin[0]}`);
if (ratedPair && !sm.includes(`/tools/vs/${ratedPair.slug}/`)) fail(`sitemap missing rated vs ${ratedPair.slug}`);
if (unratedPair && sm.includes(`/tools/vs/${unratedPair.slug}/`)) fail(`sitemap contains unrated vs ${unratedPair.slug}`);

// ── 4. JSON-LD ──────────────────────────────────────────────────────────────
const home = html('/');
for (const t of ['WebSite', 'Organization', 'SearchAction']) hasLd(home, t) ? ok(`home JSON-LD ${t}`) : fail(`home JSON-LD missing ${t}`);
const toolRated = tools.find((t) => t.rating) ?? tools[0];
const th = html(`/tools/${toolRated.slug}/`);
for (const t of ['SoftwareApplication', 'Product', 'Review', 'BreadcrumbList']) hasLd(th, t) ? ok(`tool JSON-LD ${t}`) : fail(`tool page JSON-LD missing ${t}`);
if (/AggregateRating/.test(th)) fail('tool page uses AggregateRating (policy: editorial Review only)');
if (!/data-track="visit"/.test(th)) fail('tool page missing data-track="visit" GA hook'); else ok('tool page GA outbound hook');
if (/"price":\s*"?9\.99/.test(th)) fail('tool page still lies about 9.99 price');
const aff = tools.find((t) => t.affiliateUrl);
if (aff) { const ah = html(`/tools/${aff.slug}/`); /rel="[^"]*sponsored/.test(ah) ? ok('affiliate rel=sponsored') : fail(`affiliate tool ${aff.slug} missing rel=sponsored`); }
const faqPost = posts.find((p) => readFileSync(join('src/content/blog', `${p.slug}.md`), 'utf8').includes('faqs:'));
const ph = html(`/blog/${(faqPost ?? posts[0]).slug}/`);
hasLd(ph, 'BlogPosting') ? ok('post JSON-LD BlogPosting') : fail('post JSON-LD missing BlogPosting');
if (faqPost) hasLd(ph, 'FAQPage') ? ok('post JSON-LD FAQPage') : fail('post with faqs missing FAQPage JSON-LD');
const ch = html(`/tools/category/${catSlugs[0]}/`);
hasLd(ch, 'ItemList') ? ok('category JSON-LD ItemList') : fail('category page missing ItemList JSON-LD');

// ── 5. monetization + analytics ─────────────────────────────────────────────
const sub = html('/submit/');
/buy\.polar\.sh\/polar_cl_/.test(sub) ? ok('submit: reusable Polar checkout link') : fail('submit: Polar checkout link missing or wrong host');
/polar\.sh\/checkout\/polar_c_/.test(sub) && fail('submit: single-use Polar session URL present');
/formspree\.io\/f\/xkopzklp/.test(sub) ? ok('submit: Formspree endpoint') : fail('submit: Formspree endpoint missing');
/customer_email/.test(sub) && /reference_id/.test(sub) ? ok('submit: Polar query params') : fail('submit: customer_email/reference_id handoff missing');
const succ = html('/submit/success/');
/checkout_id/.test(succ) && /formspree/.test(succ) ? ok('success: checkout_id + PAID post') : fail('success page lost checkout confirmation logic');
/polar\.sh\/iqplot\/portal/.test(html('/pricing/') + html('/terms/')) ? ok('portal URL on pricing/terms') : warn('portal URL missing from pricing/terms');
/subscribe-forms\.beehiiv\.com/.test(home) ? ok('home: Beehiiv form') : fail('home: Beehiiv newsletter form missing');
/G-XP68CXTJCM/.test(home) ? ok('GA4 id present') : fail('GA4 id missing');
/formspree/.test(html('/contact/')) ? ok('contact: Formspree') : fail('contact form lost Formspree');

// ── 6. SEO basics on a sample of pages ──────────────────────────────────────
const sample = ['/', '/tools/', `/tools/${tools[3].slug}/`, `/blog/${posts[1].slug}/`, '/news/', '/tools/quiz/', '/about/', `/tools/category/${catSlugs[2]}/`];
for (const r of sample) {
	const h = html(r); if (!h) continue;
	if (!/<title>[^<]{5,}<\/title>/.test(h)) fail(`${r}: title`);
	if (!/<meta name="description" content="[^"]{20,}"/.test(h)) fail(`${r}: meta description`);
	if (!/<link rel="canonical" href="https:\/\/getaibriefs\.com/.test(h)) fail(`${r}: canonical`);
	if (!/property="og:image" content="https:\/\/getaibriefs\.com\/(og|_astro)\//.test(h)) fail(`${r}: og:image`);
	if (/google\.com\/s2\/favicons/.test(h)) fail(`${r}: still hotlinks Google favicons`);
	if (/<h1/.test(h) === false) fail(`${r}: no h1`);
	if ((h.match(/<h1/g) || []).length > 1) warn(`${r}: multiple h1`);
}
ok('SEO sample checked');

// ── 7. design hygiene: emoji in markup, legacy classes ──────────────────────
// pictographic emoji only — typographic marks like ✓ ↑ → are legitimate
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2190}-\u{21FF}]?[\u{1F300}-\u{1FAFF}]/u;
let emojiPages = 0;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('index.html') ? [p] : []; });
const allPages = walk(DIST);
for (const p of allPages) {
	const h = readFileSync(p, 'utf8');
	// strip JSON-LD and article bodies (content may legitimately contain emoji) — only flag nav/header/footer/cards
	const chrome = (h.match(/<header[\s\S]*?<\/header>/) || [''])[0] + (h.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
	if (emojiRe.test(chrome)) { emojiPages++; if (emojiPages <= 3) fail(`emoji in header/footer chrome: ${p}`); }
}
if (!emojiPages) ok('no emoji in site chrome');
const legacy = allPages.filter((p) => /Atkinson|atkinson-regular|playfair/.test(readFileSync(p, 'utf8')));
legacy.length ? fail(`${legacy.length} pages still reference legacy fonts, e.g. ${legacy[0]}`) : ok('no legacy font references');

// ── report ──────────────────────────────────────────────────────────────────
console.log(`\n${passes.length} passed, ${warns.length} warnings, ${fails.length} failed\n`);
for (const w of warns) console.log('  WARN ', w);
for (const f of fails) console.log('  FAIL ', f);
if (process.argv.includes('--verbose')) for (const p of passes) console.log('  ok   ', p);
process.exit(fails.length ? 1 : 0);
