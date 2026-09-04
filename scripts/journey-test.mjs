#!/usr/bin/env node
/**
 * End-to-end journey test for the things that make this site a product rather
 * than a set of pages: reading the brief, tuning it, saving, searching,
 * comparing, sharing and coming back.
 *
 * Page-level checks miss cross-page breakage — localStorage contracts, the
 * view-transition router, and shared components behaving differently once you
 * navigate rather than reload. This exercises all of that in one pass.
 *
 * Usage: node scripts/journey-test.mjs [baseUrl]      (default http://127.0.0.1:4321)
 * Exit 1 on any failure.
 */
import { chromium } from 'playwright';
import { readdirSync, existsSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:4321';

function chromePath() {
	const root = '/root/.cache/ms-playwright';
	if (!existsSync(root)) return undefined;
	for (const d of readdirSync(root))
		for (const p of [`${root}/${d}/chrome-linux64/chrome`, `${root}/${d}/chrome-headless-shell-linux64/chrome-headless-shell`])
			if (existsSync(p)) return p;
	return undefined;
}

const results = [];
const check = (name, pass, detail = '') => {
	results.push({ name, pass, detail });
	console.log(`${pass ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ executablePath: chromePath() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
	const t = m.text();
	// the Astro dev toolbar's audit runs only in dev and is noisy; ignore it
	if (m.type() === 'error' && !/favicon|404 \(\)|audit's match function|astro-dev-toolbar/i.test(t)) errors.push(t);
});

try {
	// ── 1. land on the brief ──────────────────────────────────────────────────
	await page.goto(BASE + '/', { waitUntil: 'networkidle' });
	const h1 = (await page.locator('h1').first().innerText()).trim();
	check('home leads with the brief headline', h1.length > 20 && !/explained simply/i.test(h1), h1.slice(0, 60));
	const items = await page.locator('[data-brief-item], .bi__item').count();
	check('brief renders its items', items >= 4, `${items} items`);

	// ── 2. tune the brief by angle ────────────────────────────────────────────
	const chip = page.locator('[data-angle]').first();
	if (await chip.count()) {
		const before = await page.locator('.bi__item, [data-brief-item]').first().getAttribute('id');
		await chip.click();
		await page.waitForTimeout(600);
		const stored = await page.evaluate(() => localStorage.getItem('aib-angles'));
		const after = await page.locator('.bi__item, [data-brief-item]').first().getAttribute('id');
		check('angle chip persists a preference', !!stored && stored !== '[]', stored ?? '');
		check('angle chip reorders or marks the brief', before !== after || (await page.locator('.bi__divider, [data-for-you]').count()) > 0);
		await chip.click(); // reset
	} else {
		check('angle chips exist', false, 'no [data-angle] found');
	}

	// ── 3. share the brief ────────────────────────────────────────────────────
	await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
	const copyBtn = page.locator('[data-copy]').first();
	check('brief offers a copy-link action', (await copyBtn.count()) > 0);
	if (await copyBtn.count()) {
		await copyBtn.click();
		await page.waitForTimeout(400);
		const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
		check('copy-link puts a real URL on the clipboard', /^https?:\/\/|\/news\//.test(clip), clip.slice(0, 60));
	}
	const shareLinks = await page.locator('[data-share-net]').count();
	check('share targets render', shareLinks >= 3, `${shareLinks} networks`);
	const blankIcons = await page.evaluate(() =>
		[...document.querySelectorAll('[data-share-net] svg')].filter((s) => !s.innerHTML.trim()).length,
	);
	check('no blank share glyphs', blankIcons === 0, `${blankIcons} empty`);

	// ── 4. search with the palette ────────────────────────────────────────────
	await page.keyboard.press('Meta+k');
	await page.waitForTimeout(500);
	const paletteOpen = await page.evaluate(() => !document.getElementById('palette')?.hidden);
	check('⌘K opens the command palette', paletteOpen);
	if (paletteOpen) {
		await page.fill('#palette-input', 'claude');
		await page.waitForFunction(() => document.querySelectorAll('.palette__row').length > 0 || !!document.querySelector('.palette__empty'), null, { timeout: 5000 }).catch(() => {});
		const rows = await page.locator('.palette__row').count();
		check('palette returns results', rows > 0, `${rows} rows`);
		await page.keyboard.press('Enter');
		// navigation is client-side (view transitions), so wait for the URL itself
		await page.waitForURL((u) => u.pathname !== '/', { timeout: 5000 }).catch(() => {});
		check('palette navigates', new URL(page.url()).pathname !== '/', new URL(page.url()).pathname);
	}

	// ── 5. save a tool, then find it on /saved/ ───────────────────────────────
	await page.goto(BASE + '/tools/', { waitUntil: 'networkidle' });
	const save = page.locator('[data-save]').first();
	const savedName = await save.getAttribute('data-save-name');
	await save.click();
	await page.waitForTimeout(300);
	const savedStore = await page.evaluate(() => localStorage.getItem('aib-saved'));
	check('saving a tool persists it', !!savedStore && savedStore !== '{}', savedName ?? '');
	const badge = await page.evaluate(() => document.querySelector('[data-saved-count]')?.textContent?.trim());
	check('header badge reflects the save', badge === '1', `badge=${badge}`);

	await page.goto(BASE + '/saved/', { waitUntil: 'networkidle' });
	await page.waitForTimeout(600);
	const savedCards = await page.locator('.sv-card, [data-saved-card]').count();
	check('saved page lists the saved tool', savedCards >= 1, `${savedCards} cards`);

	// ── 6. compare tray ───────────────────────────────────────────────────────
	await page.goto(BASE + '/tools/chatgpt/', { waitUntil: 'networkidle' });
	const cmp = page.locator('[data-compare]').first();
	if (await cmp.count()) {
		await cmp.click();
		await page.waitForTimeout(300);
		const trayVisible = await page.evaluate(() => !document.getElementById('compare-tray')?.hidden);
		check('compare tray appears when a tool is added', trayVisible);
	} else {
		check('tool page offers compare', false, 'no [data-compare]');
	}

	// ── 7. keyboard shortcuts survive client-side navigation ──────────────────
	await page.locator('body').click({ position: { x: 5, y: 400 } }); // move focus off any control
	await page.keyboard.press('g');
	await page.waitForTimeout(120); // the chord needs two distinct keydowns
	await page.keyboard.press('b');
	await page.waitForURL((u) => /\/news\/?$/.test(u.pathname), { timeout: 6000 }).catch(() => {});
	check('shortcut g b reaches the briefs archive', /\/news\/?$/.test(new URL(page.url()).pathname), new URL(page.url()).pathname);
	await page.waitForLoadState('networkidle').catch(() => {});

	// ── 8. the return visit: streak ───────────────────────────────────────────
	const streak = await page.evaluate(() => localStorage.getItem('aib-news-days'));
	check('visiting the briefs records a day for the streak', !!streak, streak ?? '');

	// ── 9. quiz produces a shareable result ───────────────────────────────────
	await page.goto(BASE + '/tools/quiz/?r=write,pro,free,daily,easy', { waitUntil: 'networkidle' });
	await page.waitForTimeout(900);
	const matchName = await page.evaluate(() => document.querySelector('.qz-top__name, [data-match-name]')?.textContent?.trim() ?? '');
	check('a shared quiz link resolves to a match', matchName.length > 1, matchName);
	const quizShare = await page.locator('[data-share-net]').count();
	check('quiz result is shareable', quizShare >= 3, `${quizShare} networks`);

	// ── 10. no console errors anywhere in the journey ─────────────────────────
	check('no console errors during the journey', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
	check('journey completed without throwing', false, e.message.split('\n')[0]);
} finally {
	await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} journey checks passed`);
process.exit(failed.length ? 1 : 0);
