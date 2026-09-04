#!/usr/bin/env node
/**
 * a11y-audit.mjs — measurement-first accessibility + performance audit.
 *
 * Usage:
 *   node scripts/a11y-audit.mjs [--base=http://127.0.0.1:4321] [--routes=/,/tools/]
 *                               [--themes=dark,light] [--vps=desk,mob]
 *                               [--only=contrast,focus,structure,names,motion,layout,weight]
 *                               [--json=<path>] [--quiet]
 *
 * Every check is a *number*, not a screenshot. The only images it takes are the
 * two reduced-motion frames it diffs (in memory, never written to disk).
 */
import { chromium } from '/root/ai-simply/node_modules/playwright/index.mjs';
import { existsSync, readdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

// ── config ────────────────────────────────────────────────────────────────
function chromePath() {
	const root = '/root/.cache/ms-playwright';
	for (const d of readdirSync(root)) {
		for (const p of [`${root}/${d}/chrome-linux64/chrome`, `${root}/${d}/chrome-headless-shell-linux64/chrome-headless-shell`]) {
			if (existsSync(p)) return p;
		}
	}
	return undefined;
}

const arg = (k, d) => {
	const hit = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
	return hit ? hit.slice(k.length + 3) : d;
};
const flag = (k) => process.argv.slice(2).includes(`--${k}`);

const BASE = arg('base', 'http://127.0.0.1:4321').replace(/\/$/, '');
const DIST = arg('dist', '/root/ai-simply/dist');
const ROUTES = arg('routes',
	'/,/news/,/news/2026-09-02/,/tools/,/tools/chatgpt/,/blog/,/blog/chatgpt-vs-claude-for-beginners/,/tools/quiz/,/submit/,/saved/,/404'
).split(',').filter(Boolean);
const THEMES = arg('themes', 'dark,light').split(',');
const VPS = arg('vps', 'desk,mob').split(',');
const ONLY = arg('only', '').split(',').filter(Boolean);
const want = (c) => !ONLY.length || ONLY.includes(c);
const JSON_OUT = arg('json', '');
const QUIET = flag('quiet');

const VIEWPORTS = { desk: { width: 1440, height: 900 }, mob: { width: 390, height: 844 } };
const HTML_GZIP_BUDGET = 100 * 1024;

const findings = []; // {check, sev, route, theme, vp, msg, data}
const stats = {};
const add = (check, sev, ctx, msg, data) => findings.push({ check, sev, ...ctx, msg, data });

// ── browser-side probes (stringified into the page) ───────────────────────

/** Contrast: real rendered ratio for every visible text node. */
const PROBE_CONTRAST = `() => {
  const parse = (s) => {
    if (!s || s === 'transparent') return [0,0,0,0];
    const m = s.match(/-?[\\d.]+/g);
    if (!m) return [0,0,0,0];
    return [ +m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1 ];
  };
  const over = (fg, bg) => { // fg over bg, both [r,g,b,a]
    const a = fg[3] + bg[3] * (1 - fg[3]);
    if (a === 0) return [0,0,0,0];
    return [0,1,2].map(i => (fg[i]*fg[3] + bg[i]*bg[3]*(1-fg[3])) / a).concat([a]);
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]);
  };
  const ratio = (a, b) => { const [x,y] = [lum(a), lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
  const sel = (el) => {
    const bits = [];
    let n = el, depth = 0;
    while (n && n.nodeType === 1 && depth < 3) {
      let s = n.tagName.toLowerCase();
      if (n.id) { bits.unshift(s + '#' + n.id); break; }
      const cls = (n.getAttribute('class') || '').trim().split(/\\s+/).filter(c => c && !c.startsWith('astro-')).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      bits.unshift(s); n = n.parentElement; depth++;
    }
    return bits.join(' > ');
  };

  const rootBg = parse(getComputedStyle(document.documentElement).backgroundColor);
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
  const pageBg = rootBg[3] >= 1 ? rootBg : (bodyBg[3] >= 1 ? bodyBg : over(bodyBg, over(rootBg, [255,255,255,1])));

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const txt = node.textContent.replace(/\\s+/g, ' ').trim();
    if (!txt) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE|OPTION)$/.test(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('[hidden], [aria-hidden="true"], .sr-only, .visually-hidden')) continue;
    if (cs.webkitTextFillColor && cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)') continue; // gradient text

    // cumulative opacity
    let opacity = 1, p = el;
    while (p && p.nodeType === 1) { opacity *= parseFloat(getComputedStyle(p).opacity || '1'); p = p.parentElement; }
    if (opacity < 0.06) continue;

    // effective background: composite ancestor backgrounds until opaque
    let bg = [0,0,0,0], approx = false, a = el;
    while (a && a.nodeType === 1 && bg[3] < 0.999) {
      const acs = getComputedStyle(a);
      if (acs.backgroundImage && acs.backgroundImage !== 'none') approx = true;
      bg = over(bg, parse(acs.backgroundColor));
      a = a.parentElement;
    }
    if (bg[3] < 0.999) bg = over(bg, pageBg);
    if (bg[3] < 0.999) bg = over(bg, [255,255,255,1]);

    let fg = parse(cs.color);
    if (opacity < 1) fg = [fg[0], fg[1], fg[2], fg[3] * opacity];
    const fgOn = over(fg, bg);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 19 && weight >= 700);
    const req = large ? 3 : 4.5;
    const cr = ratio(fgOn, bg);
    if (cr + 0.005 < req) {
      out.push({
        sel: sel(el), tag: el.tagName.toLowerCase(),
        text: txt.slice(0, 48),
        fg: 'rgb(' + fgOn.slice(0,3).map(Math.round).join(',') + ')',
        bg: 'rgb(' + bg.slice(0,3).map(Math.round).join(',') + ')',
        size: Math.round(size * 10) / 10, weight, large, req,
        ratio: Math.round(cr * 100) / 100,
        approx,
        n: 1,
      });
    }
  }
  return { total: seen.size, fails: out };
}`;

/** Landmarks + headings + skip link. */
const PROBE_STRUCTURE = `() => {
  const vis = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0 || el.closest('.sr-only,.visually-hidden')); };
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter((h) => h.textContent.trim() && !h.closest('[hidden]') && getComputedStyle(h).display !== 'none')
    .map((h) => ({ level: +h.tagName[1], text: h.textContent.replace(/\\s+/g,' ').trim().slice(0, 60) }));
  const navs = [...document.querySelectorAll('nav, [role="navigation"]')].map((n) => ({
    label: n.getAttribute('aria-label') || (n.getAttribute('aria-labelledby')
      ? (document.getElementById(n.getAttribute('aria-labelledby'))?.textContent || '').trim() : ''),
    where: n.className || n.id || n.parentElement?.tagName || '',
  }));
  return {
    h1: heads.filter((h) => h.level === 1).map((h) => h.text),
    heads,
    main: document.querySelectorAll('main, [role="main"]').length,
    nav: navs,
    footer: document.querySelectorAll('footer, [role="contentinfo"]').length,
    header: document.querySelectorAll('header, [role="banner"]').length,
    skip: (() => { const s = document.querySelector('.skip-link, a[href^="#main"], a[href^="#content"]');
      return s ? { href: s.getAttribute('href'), target: !!document.querySelector(s.getAttribute('href')) } : null; })(),
    landmarksNoLabelDup: navs.length > 1 && navs.some((n) => !n.label),
    dupIds: (() => { const c = {}, d = []; document.querySelectorAll('[id]').forEach((e) => { c[e.id] = (c[e.id]||0)+1; });
      for (const k in c) if (c[k] > 1) d.push(k + ' x' + c[k]); return d.slice(0, 10); })(),
    langAttr: document.documentElement.lang || '',
  };
}`;

/** Accessible names for interactive elements + img alt. */
const PROBE_NAMES = `() => {
  const txt = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim();
  const byIds = (ids) => (ids || '').split(/\\s+/).filter(Boolean)
    .map((id) => txt(document.getElementById(id) || document.createElement('i'))).join(' ').trim();
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + '#' + el.id;
    const cls = (el.getAttribute('class') || '').trim().split(/\\s+/).filter((c) => c && !c.startsWith('astro-')).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    const p = el.parentElement; if (p) s = (p.tagName.toLowerCase() + (p.className && typeof p.className === 'string' ? '.' + p.className.trim().split(/\\s+/).filter(c=>!c.startsWith('astro-'))[0] : '')) + ' > ' + s;
    return s;
  };
  const shown = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width * r.height > 0); };
  const name = (el) => {
    if (el.getAttribute('aria-labelledby')) { const n = byIds(el.getAttribute('aria-labelledby')); if (n) return n; }
    const al = (el.getAttribute('aria-label') || '').trim(); if (al) return al;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      if (el.id) { const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l && txt(l)) return txt(l); }
      const wrap = el.closest('label'); if (wrap && txt(wrap)) return txt(wrap);
      if (el.type === 'submit' || el.type === 'button') { if (el.value) return el.value; }
      if (el.title) return el.title;
      if (el.placeholder) return '(placeholder) ' + el.placeholder;
      return '';
    }
    const t = txt(el); if (t) return t;
    const img = el.querySelector('img[alt]'); if (img && img.alt.trim()) return img.alt.trim();
    const svgT = el.querySelector('svg title, svg [aria-label]');
    if (svgT) return (svgT.textContent || svgT.getAttribute('aria-label') || '').trim();
    if (el.title) return el.title;
    return '';
  };

  const controls = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])')];
  const unnamed = [], noAlt = [], inputs = [];
  for (const el of controls) {
    if (el.closest('[hidden]') || !shown(el)) continue;
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
    const n = name(el);
    if (!n) unnamed.push({ sel: sel(el), tag: el.tagName.toLowerCase(), type: el.type || '', html: el.outerHTML.slice(0, 120) });
    else if (n.startsWith('(placeholder)')) inputs.push({ sel: sel(el), name: n });
  }
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) noAlt.push({ src: (img.currentSrc || img.src || '').split('/').slice(-1)[0], sel: sel(img) });
  }
  return { controls: controls.length, unnamed, noAlt, placeholderOnly: inputs,
    emptyLinks: [...document.querySelectorAll('a[href=""], a:not([href])[role="link"]')].length };
}`;

/**
 * Layout overflow: elements that escape the viewport *to the document*.
 * An element inside a horizontal scroller (.scroll-x rails, overflow-x:auto)
 * or inside a clipping ancestor is contained by design, so it is skipped —
 * only overflow that could actually widen or clip the page is reported.
 */
const PROBE_OVERFLOW = `() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  const seen = new Set();
  const contained = (el) => {
    let a = el.parentElement;
    while (a && a !== document.documentElement) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) {
        const ar = a.getBoundingClientRect();
        if (ar.right <= vw + 1 && ar.left >= -1) return true;
      }
      a = a.parentElement;
    }
    return false;
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (cs.position === 'fixed' && (cs.transform !== 'none' || parseFloat(cs.opacity) === 0)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const right = r.right + window.scrollX, left = r.left + window.scrollX;
    if (right > vw + 1 || left < -1) {
      if (contained(el)) continue;
      let s = el.tagName.toLowerCase();
      const cls = (el.getAttribute('class') || '').trim().split(/\\s+/).filter((c) => c && !c.startsWith('astro-')).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      const key = s + '|' + Math.round(r.width);
      if (seen.has(key)) continue; seen.add(key);
      const decorative = cs.pointerEvents === 'none' && !el.textContent.trim() &&
        (cs.position === 'absolute' || cs.position === 'fixed');
      bad.push({ sel: s, w: Math.round(r.width), left: Math.round(left), right: Math.round(right), vw, decorative });
    }
    if (bad.length > 12) break;
  }
  return { vw, docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, bad };
}`;

/** Running animations (used under prefers-reduced-motion). */
const PROBE_ANIMS = `() => {
  if (!document.getAnimations) return [];
  return document.getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
      const dur = typeof t.duration === 'number' ? t.duration : 0;
      const it = t.iterations === Infinity ? 'inf' : t.iterations;
      const el = a.effect && a.effect.target;
      let s = el && el.tagName ? el.tagName.toLowerCase() : '?';
      if (el && el.getAttribute) {
        const cls = (el.getAttribute('class') || '').trim().split(/\\s+/).filter((c) => c && !c.startsWith('astro-')).slice(0, 2);
        if (cls.length) s += '.' + cls.join('.');
      }
      return { sel: s, name: a.animationName || (a.transitionProperty || 'anim'), dur, it };
    })
    .filter((a) => a.dur > 100 || a.it === 'inf');
}`;

// ── check runners ─────────────────────────────────────────────────────────

async function checkContrast(page, ctx) {
	const res = await page.evaluate(`(${PROBE_CONTRAST})()`);
	stats.textNodes = (stats.textNodes || 0) + res.total;
	// merge duplicates by fg/bg/size class
	const merged = new Map();
	for (const f of res.fails) {
		const k = `${f.fg}|${f.bg}|${f.req}|${f.sel}`;
		if (merged.has(k)) merged.get(k).n++;
		else merged.set(k, f);
	}
	for (const f of merged.values()) add('contrast', f.ratio < f.req * 0.8 ? 'high' : 'med', ctx,
		`${f.ratio}:1 (need ${f.req}) ${f.fg} on ${f.bg} — ${f.sel}${f.approx ? ' [over image/gradient]' : ''}`, f);
	return res.fails.length;
}

async function checkStructure(page, ctx) {
	const s = await page.evaluate(`(${PROBE_STRUCTURE})()`);
	if (s.h1.length !== 1) add('structure', 'high', ctx, `${s.h1.length} <h1> (need exactly 1)`, s.h1);
	if (!s.main) add('structure', 'high', ctx, 'no <main> landmark');
	if (!s.footer) add('structure', 'high', ctx, 'no <footer>/contentinfo landmark');
	if (!s.nav.length) add('structure', 'med', ctx, 'no <nav> landmark');
	for (const n of s.nav) if (!n.label) add('structure', 'med', ctx, `unlabelled <nav> (${n.where})`, n);
	if (!s.skip) add('structure', 'high', ctx, 'no skip link');
	else if (!s.skip.target) add('structure', 'high', ctx, `skip link target ${s.skip.href} missing`);
	if (!s.langAttr) add('structure', 'med', ctx, '<html> has no lang');
	if (s.dupIds.length) add('structure', 'med', ctx, `duplicate ids: ${s.dupIds.join(', ')}`);
	// heading order
	let prev = 0;
	for (const h of s.heads) {
		if (prev && h.level > prev + 1) add('structure', 'med', ctx, `heading jump h${prev} → h${h.level}: "${h.text}"`, h);
		prev = h.level;
	}
	return s;
}

async function checkNames(page, ctx) {
	const n = await page.evaluate(`(${PROBE_NAMES})()`);
	for (const u of n.unnamed) add('names', 'high', ctx, `no accessible name: ${u.sel} — ${u.html.replace(/\s+/g, ' ')}`, u);
	for (const i of n.noAlt) add('names', 'high', ctx, `<img> without alt: ${i.sel} (${i.src})`, i);
	for (const p of n.placeholderOnly) add('names', 'med', ctx, `input named only by placeholder: ${p.sel} — "${p.name}"`, p);
	return n;
}

/**
 * Focus visibility. Snapshot every focusable element's UNFOCUSED computed style
 * first, then walk the real tab order with real Tab keypresses (so :focus-visible
 * genuinely applies) and diff. No blur/refocus trick — that loses :focus-visible.
 */
async function checkFocus(page, ctx) {
	await page.evaluate(() => {
		// Normalise before comparing: an outline that is 0px wide, style:none or a
		// transparent colour paints nothing, so it must not count as "changed".
		const readOne = (el) => {
			const cs = getComputedStyle(el);
			const paints = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 &&
				!/rgba\(\d+, ?\d+, ?\d+, ?0\)|transparent/.test(cs.outlineColor);
			const outline = paints ? `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} ${cs.outlineOffset}` : 'none';
			const shadow = cs.boxShadow === 'none' || /rgba\(\d+, ?\d+, ?\d+, ?0\)/.test(cs.boxShadow) ? 'none' : cs.boxShadow;
			return [outline, shadow, cs.borderColor, cs.borderWidth, cs.backgroundColor, cs.color,
				cs.textDecorationLine, cs.textDecorationColor, cs.transform, cs.filter, cs.opacity].join('|');
		};
		// A focus ring is often drawn on a wrapper (.tc:focus-within, .tl__sort:focus-within),
		// so the indicator is "the element or any of its first three ancestors changed".
		const read = (el) => {
			const parts = [];
			let n = el;
			for (let i = 0; i < 4 && n && n.nodeType === 1; i++) { parts.push(readOne(n)); n = n.parentElement; }
			return parts.join('#');
		};
		window.__a11yRead = read;
		window.__a11yBase = new WeakMap();
		const q = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, details, [tabindex]:not([tabindex="-1"]), audio[controls], video[controls], iframe';
		for (const el of document.querySelectorAll(q)) window.__a11yBase.set(el, read(el));
		window.scrollTo(0, 0);
		if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
	});

	const order = [];
	const noIndicator = [];
	let trapAt = -1, lastKey = '', repeats = 0;

	for (let i = 0; i < 25; i++) {
		await page.keyboard.press('Tab');
		// .input / .card transition border-color and box-shadow over var(--dur-2);
		// read too early and getComputedStyle still reports the unfocused value.
		await page.evaluate(async () => {
			const deadline = Date.now() + 500;
			for (;;) {
				await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));
				const running = document.getAnimations
					? document.getAnimations().filter((a) => a.playState === 'running').length : 0;
				if (!running || Date.now() > deadline) break;
			}
		});
		const info = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el || el === document.body || el === document.documentElement) return { key: 'body', desc: 'body' };
			const cs = getComputedStyle(el);
			let s = el.tagName.toLowerCase();
			if (el.id) s += '#' + el.id;
			const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter((c) => c && !c.startsWith('astro-')).slice(0, 2);
			if (cls.length) s += '.' + cls.join('.');
			const label = (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 28);
			const focused = window.__a11yRead(el);
			const base = window.__a11yBase.get(el);
			const r = el.getBoundingClientRect();
			let hasOutline = false;
			for (let n = el, i = 0; n && i < 4; n = n.parentElement, i++) {
				const ncs = getComputedStyle(n);
				if (ncs.outlineStyle !== 'none' && parseFloat(ncs.outlineWidth) > 0 &&
					!/rgba\(\d+, ?\d+, ?\d+, ?0\)|transparent/.test(ncs.outlineColor)) { hasOutline = true; break; }
			}
			return {
				key: s + '|' + label, desc: s + (label ? ` "${label}"` : ''),
				changed: base === undefined ? null : focused !== base,
				hasOutline, focusVisible: el.matches(':focus-visible'),
				w: Math.round(r.width), h: Math.round(r.height),
				focused: focused.slice(0, 100),
				inViewport: r.top < innerHeight && r.bottom > 0,
			};
		});
		if (info.key === 'body') break;
		order.push(info.desc);
		if (info.key === lastKey) { repeats++; if (repeats >= 3) { trapAt = i; break; } } else { repeats = 0; lastKey = info.key; }
		if (info.changed === false && !info.hasOutline) {
			noIndicator.push({ el: info.desc, size: `${info.w}x${info.h}`, fv: info.focusVisible, style: info.focused });
		}
	}

	if (trapAt >= 0) add('focus', 'high', ctx, `focus trapped at stop ${trapAt}: ${order[trapAt]}`, order.slice(Math.max(0, trapAt - 2)));
	for (const n of noIndicator) add('focus', 'high', ctx,
		`no visible focus indicator: ${n.el} (${n.size}, :focus-visible=${n.fv})`, n);
	stats.tabStops = Math.max(stats.tabStops || 0, order.length);
	return { order, noIndicator, trapAt };
}

async function checkSkipLink(page, ctx) {
	await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur?.(); });
	await page.keyboard.press('Tab');
	await page.waitForTimeout(320); // the skip link slides in over var(--dur-2)
	const first = await page.evaluate(() => {
		const el = document.activeElement;
		if (!el) return null;
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle(el);
		return { cls: el.getAttribute('class') || '', href: el.getAttribute('href') || '',
			top: Math.round(r.top), left: Math.round(r.left), onscreen: r.top >= -2 && r.top < innerHeight && r.height > 0,
			opacity: cs.opacity, clip: cs.clipPath };
	});
	if (!first) { add('structure', 'high', ctx, 'Tab from top focused nothing'); return; }
	if (!/skip-link/.test(first.cls)) {
		add('structure', 'high', ctx, `skip link is not the first tab stop (got .${first.cls || '?'})`, first);
		return;
	}
	if (!first.onscreen) add('structure', 'high', ctx, `focused skip link is not visible (top=${first.top}px)`, first);
	await page.keyboard.press('Enter');
	await page.waitForTimeout(150);
	const landed = await page.evaluate(() => ({ hash: location.hash, active: document.activeElement?.id || document.activeElement?.tagName }));
	if (landed.hash !== '#main') add('structure', 'med', ctx, `skip link did not move to #main (hash=${landed.hash})`, landed);
	stats.skip = landed;
}

async function checkLayout(page, ctx) {
	const o = await page.evaluate(`(${PROBE_OVERFLOW})()`);
	if (o.docW > o.vw + 1) add('layout', 'high', ctx, `horizontal scroll: document ${o.docW}px > viewport ${o.vw}px`, o);
	for (const b of o.bad) add('layout', b.decorative ? 'low' : (b.right > o.vw + 24 ? 'high' : 'med'), ctx,
		`element past the viewport: ${b.sel} ${b.w}px (left ${b.left}, right ${b.right} vs ${b.vw})` +
		(b.decorative ? ' [decorative, pointer-events:none, clipped by overflow-x:clip]' : ''), b);
	return o;
}

const CLS_INIT = () => {
	window.__cls = 0; window.__clsSources = [];
		try {
			new PerformanceObserver((l) => {
				for (const e of l.getEntries()) {
					if (e.hadRecentInput) continue;
					window.__cls += e.value;
					if (e.value > 0.002 && e.sources) {
						for (const s of e.sources) {
							const el = s.node;
							if (!el || !el.tagName) continue;
							let sel = el.tagName.toLowerCase();
							const cls = (el.getAttribute?.('class') || '').trim().split(/\s+/).filter((c) => c && !c.startsWith('astro-')).slice(0, 2);
							if (cls.length) sel += '.' + cls.join('.');
							window.__clsSources.push({ sel, v: Math.round(e.value * 1000) / 1000 });
						}
					}
				}
			}).observe({ type: 'layout-shift', buffered: true });
		} catch (e) {}
};

async function measureCLS(page, url) {
	await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
	await page.evaluate(async () => {
		const step = Math.round(innerHeight * 0.9);
		for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
			window.scrollTo({ top: y, behavior: 'instant' });
			await new Promise((r) => setTimeout(r, 120));
		}
		window.scrollTo({ top: 0, behavior: 'instant' });
		await new Promise((r) => setTimeout(r, 600));
	});
	return page.evaluate(() => ({ cls: Math.round(window.__cls * 1000) / 1000, sources: window.__clsSources.slice(0, 6) }));
}

async function checkMotion(browser, route, theme) {
	const ctx0 = { route, theme, vp: 'desk' };
	const ctx = await browser.newContext({
		viewport: VIEWPORTS.desk, deviceScaleFactor: 1, colorScheme: theme,
		reducedMotion: 'reduce',
	});
	await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch (e) {} }, theme);
	const page = await ctx.newPage();
	try {
		await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 });
		await page.addStyleTag({ content: 'astro-dev-toolbar,#dev-toolbar-root{display:none!important}' });
		await page.waitForTimeout(600);
		const a = await page.screenshot();
		await page.waitForTimeout(700);
		const b = await page.screenshot();
		const anims = await page.evaluate(`(${PROBE_ANIMS})()`);
		let diffPx = 0;
		if (!a.equals(b)) {
			try {
				const sharp = (await import('/root/ai-simply/node_modules/sharp/lib/index.js')).default;
				const [ra, rb] = await Promise.all([
					sharp(a).raw().toBuffer({ resolveWithObject: true }),
					sharp(b).raw().toBuffer({ resolveWithObject: true }),
				]);
				const A = ra.data, B = rb.data, ch = ra.info.channels;
				for (let i = 0; i < A.length; i += ch) {
					if (Math.abs(A[i] - B[i]) > 6 || Math.abs(A[i + 1] - B[i + 1]) > 6 || Math.abs(A[i + 2] - B[i + 2]) > 6) diffPx++;
				}
			} catch (e) { diffPx = -1; }
		}
		if (diffPx > 40) add('motion', 'high', ctx0, `frames 700ms apart differ in ${diffPx} px under prefers-reduced-motion`, { diffPx });
		for (const an of anims) add('motion', 'high', ctx0, `animation still running under reduce: ${an.sel} ${an.name} ${an.dur}ms x${an.it}`, an);
		return { diffPx, anims: anims.length, identical: a.equals(b) };
	} finally { await ctx.close(); }
}

// ── weight (dev server requests + dist gzip truth) ────────────────────────
async function checkWeight(browser, route) {
	const ctx = await browser.newContext({ viewport: VIEWPORTS.desk, colorScheme: 'dark' });
	const page = await ctx.newPage();
	const reqs = [];
	page.on('requestfinished', async (r) => {
		try {
			const s = await r.sizes();
			const resp = await r.response();
			reqs.push({ url: r.url(), type: r.resourceType(),
				bytes: (s.responseBodySize || 0) + (s.responseHeadersSize || 0),
				body: s.responseBodySize || 0, status: resp ? resp.status() : 0 });
		} catch (e) {}
	});
	try {
		await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 });
		await page.waitForTimeout(400);
	} catch (e) { /* ignore */ }
	await ctx.close();
	const ext = reqs.filter((r) => !/127\.0\.0\.1:4321/.test(r.url));
	const js = reqs.filter((r) => r.type === 'script').reduce((a, r) => a + r.body, 0);
	const top = [...reqs].sort((a, b) => b.bytes - a.bytes).slice(0, 3)
		.map((r) => `${r.url.replace(BASE, '').split('?')[0].slice(-42)} ${(r.bytes / 1024).toFixed(0)}KB`);
	return { requests: reqs.length, transferred: reqs.reduce((a, r) => a + r.bytes, 0), js, external: ext.length, top };
}

function distHtmlFor(route) {
	const r = route.replace(/^\//, '').replace(/\/$/, '');
	for (const p of [join(DIST, r, 'index.html'), join(DIST, r + '.html'), join(DIST, r || 'index', 'index.html')]) {
		if (existsSync(p) && statSync(p).isFile()) return p;
	}
	if (!r) return join(DIST, 'index.html');
	return null;
}

function distWeight(route) {
	const f = distHtmlFor(route);
	if (!f) return null;
	const buf = readFileSync(f);
	const gz = gzipSync(buf, { level: 9 }).length;
	// local JS referenced from this HTML
	const html = buf.toString('utf8');
	const srcs = [...html.matchAll(/<script[^>]+src="(\/[^"]+)"/g)].map((m) => m[1]);
	const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1].length).reduce((a, b) => a + b, 0);
	let jsGz = 0;
	for (const s of new Set(srcs)) {
		const p = join(DIST, s.replace(/^\//, ''));
		if (existsSync(p)) jsGz += gzipSync(readFileSync(p), { level: 9 }).length;
	}
	const cssHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/[^"]+)"/g)].map((m) => m[1]);
	let cssGz = 0;
	for (const s of new Set(cssHrefs)) {
		const p = join(DIST, s.replace(/^\//, ''));
		if (existsSync(p)) cssGz += gzipSync(readFileSync(p), { level: 9 }).length;
	}
	return { file: f.replace(DIST, 'dist'), raw: buf.length, gz, jsFiles: new Set(srcs).size, jsGz,
		inlineJsRaw: inline, cssGz };
}

// ── main ──────────────────────────────────────────────────────────────────
const t0 = Date.now();
const browser = await chromium.launch({ executablePath: chromePath() });
const perRoute = {};

for (const theme of THEMES) {
	for (const vpName of VPS) {
		const ctxBrowser = await browser.newContext({
			viewport: VIEWPORTS[vpName], deviceScaleFactor: 1, colorScheme: theme,
		});
		await ctxBrowser.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch (e) {} }, theme);
		const page = await ctxBrowser.newPage();
		const consoleErrors = [];
		page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 160)));
		page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

		for (const route of ROUTES) {
			const ctx = { route, theme, vp: vpName };
			try {
				await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 });
				await page.addStyleTag({ content: 'astro-dev-toolbar,#dev-toolbar-root{display:none!important}' });
				// let reveals fire so nothing is measured at opacity 0
				await page.evaluate(async () => {
					const step = Math.round(innerHeight * 0.9);
					for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
						window.scrollTo({ top: y, behavior: 'instant' });
						await new Promise((r) => setTimeout(r, 60));
					}
					window.scrollTo({ top: 0, behavior: 'instant' });
					// Wait until every reveal transition has finished — colours read
					// mid-fade are composited against the page and produce phantom
					// contrast failures.
					const deadline = Date.now() + 2500;
					for (;;) {
						await new Promise((r) => setTimeout(r, 120));
						const running = document.getAnimations
							? document.getAnimations().filter((a) => a.playState === 'running').length : 0;
						if (!running || Date.now() > deadline) break;
					}
					await new Promise((r) => setTimeout(r, 200));
				});
				if (want('contrast')) await checkContrast(page, ctx);
				if (want('layout')) await checkLayout(page, ctx);
				// structure/names/focus are theme- and viewport-sensitive only in the mobile nav,
				// so run them for both viewports but only the first theme.
				if (theme === THEMES[0]) {
					if (want('structure')) { await checkStructure(page, ctx); await checkSkipLink(page, ctx); }
					if (want('names')) await checkNames(page, ctx);
					if (want('focus')) await checkFocus(page, ctx);
				}
				if (!QUIET) process.stdout.write('.');
			} catch (e) {
				add('error', 'high', ctx, `route failed: ${e.message.split('\n')[0]}`);
			}
		}
		if (consoleErrors.length) {
			const uniq = [...new Set(consoleErrors)]
				.filter((e) => !/favicon|ERR_/.test(e))
				// /404 is *supposed* to answer 404; the navigation's own status is not a defect
				.filter((e) => !(ROUTES.includes('/404') && /status of 404/.test(e)))
				.slice(0, 6);
			for (const e of uniq) add('console', 'med', { theme, vp: vpName }, `console error: ${e}`);
		}
		await ctxBrowser.close();
	}
}

// CLS + overflow at mobile, one theme
if (want('layout')) {
	const c = await browser.newContext({ viewport: VIEWPORTS.mob, colorScheme: 'dark' });
	await c.addInitScript(CLS_INIT);
	const p = await c.newPage();
	for (const route of ROUTES) {
		try {
			const r = await measureCLS(p, BASE + route);
			perRoute[route] = { ...(perRoute[route] || {}), cls: r.cls };
			if (r.cls > 0.1) add('layout', 'high', { route, vp: 'mob' }, `CLS ${r.cls} (>0.1)`, r.sources);
			else if (r.cls > 0.05) add('layout', 'med', { route, vp: 'mob' }, `CLS ${r.cls}`, r.sources);
		} catch (e) { add('layout', 'med', { route, vp: 'mob' }, `CLS measure failed: ${e.message.split('\n')[0]}`); }
		if (!QUIET) process.stdout.write('c');
	}
	await c.close();
}

// motion
const motionResults = {};
if (want('motion')) {
	for (const route of ['/', '/tools/quiz/']) {
		for (const theme of THEMES.slice(0, 1)) {
			motionResults[route] = await checkMotion(browser, route, theme);
			if (!QUIET) process.stdout.write('m');
		}
	}
}

// weight
if (want('weight')) {
	for (const route of ROUTES) {
		const dev = await checkWeight(browser, route);
		const dist = distWeight(route);
		perRoute[route] = { ...(perRoute[route] || {}), dev, dist };
		if (dist && dist.gz > HTML_GZIP_BUDGET) {
			add('weight', 'high', { route }, `HTML ${(dist.gz / 1024).toFixed(1)}KB gzipped > 100KB budget (${(dist.raw / 1024).toFixed(0)}KB raw)`, dist);
		}
		if (!QUIET) process.stdout.write('w');
	}
}

await browser.close();
if (!QUIET) process.stdout.write('\n');

// ── report ────────────────────────────────────────────────────────────────
const bySev = (s) => findings.filter((f) => f.sev === s).length;
const byCheck = {};
for (const f of findings) byCheck[f.check] = (byCheck[f.check] || 0) + 1;

const L = [];
L.push(`\n═══ a11y + perf audit — ${ROUTES.length} routes × ${THEMES.join('/')} × ${VPS.join('/')} — ${((Date.now() - t0) / 1000).toFixed(0)}s`);
L.push(`findings: ${findings.length}  (high ${bySev('high')}, med ${bySev('med')}, low ${bySev('low')})  ` +
	Object.entries(byCheck).map(([k, v]) => `${k}=${v}`).join(' '));

for (const check of ['contrast', 'focus', 'structure', 'names', 'motion', 'layout', 'weight', 'console', 'error']) {
	const fs = findings.filter((f) => f.check === check);
	if (!fs.length) { L.push(`\n── ${check.toUpperCase()}: clean`); continue; }
	L.push(`\n── ${check.toUpperCase()} (${fs.length})`);
	// dedupe identical messages across route/theme/vp
	const m = new Map();
	for (const f of fs) {
		const k = f.msg;
		if (!m.has(k)) m.set(k, { f, where: new Set() });
		m.get(k).where.add(`${f.route || '-'}${f.theme ? ' ' + f.theme[0] : ''}${f.vp ? '/' + f.vp : ''}`);
	}
	const rank = { high: 0, med: 1, low: 2 };
	const sorted = [...m.values()].sort((a, b) => {
		if (check === 'contrast') return (a.f.data?.ratio ?? 9) - (b.f.data?.ratio ?? 9);
		return (rank[a.f.sev] - rank[b.f.sev]) || (b.where.size - a.where.size);
	});
	for (const { f, where } of sorted.slice(0, 30)) {
		const w = [...where];
		L.push(`  [${f.sev}] ${f.msg}`);
		L.push(`        ${w.length > 4 ? `${w.length} places: ${w.slice(0, 4).join(', ')}…` : w.join(', ')}`);
	}
	if (sorted.length > 30) L.push(`  … ${sorted.length - 30} more`);
}

if (want('weight')) {
	L.push('\n── WEIGHT (dev server transfer, uncompressed; dist = gzip -9 of the built file)');
	L.push('  route                                  reqs  devKB   JSkB | distHTMLgz  JSgz  CSSgz  CLS');
	for (const route of ROUTES) {
		const p = perRoute[route] || {};
		const d = p.dev || {}, x = p.dist;
		L.push('  ' + route.padEnd(38) +
			String(d.requests ?? '-').padStart(4) +
			((d.transferred / 1024) || 0).toFixed(0).padStart(7) +
			((d.js / 1024) || 0).toFixed(0).padStart(7) + ' |' +
			(x ? (x.gz / 1024).toFixed(1).padStart(10) : '         -') +
			(x ? (x.jsGz / 1024).toFixed(1).padStart(6) : '     -') +
			(x ? (x.cssGz / 1024).toFixed(1).padStart(7) : '      -') +
			String(p.cls ?? '-').padStart(6));
	}
	const biggest = ROUTES.map((r) => perRoute[r]?.dev?.top?.[0]).filter(Boolean);
	L.push('  largest single resources: ' + [...new Set(biggest)].slice(0, 4).join(' · '));
}

if (want('motion')) {
	L.push('\n── MOTION (prefers-reduced-motion: reduce, two frames 700ms apart)');
	for (const [r, v] of Object.entries(motionResults)) {
		L.push(`  ${r.padEnd(16)} identical=${v.identical} diffPx=${v.diffPx} runningAnimations=${v.anims}`);
	}
}

L.push(`\n── COVERAGE: ${stats.textNodes || 0} text nodes measured, ${stats.tabStops || 0} tab stops walked (max per page)`);
console.log(L.join('\n'));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ findings, perRoute, motionResults, stats }, null, 2));
process.exitCode = bySev('high') ? 1 : 0;
