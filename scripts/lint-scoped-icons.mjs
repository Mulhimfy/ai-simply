#!/usr/bin/env node
/**
 * Catch a silent Astro styling trap.
 *
 * A `class` passed to a child component (`<Icon class="foo">`) lands on that
 * child's own root element, which carries the CHILD's scope id — not the
 * parent's. So a scoped rule in the parent (`.foo { … }`) compiles to
 * `.foo[data-astro-cid-PARENT]` and silently matches nothing. Nothing errors;
 * the styling just never happens. This shipped a theme toggle with both glyphs
 * stacked on every page before it was noticed.
 *
 * This lint flags any scoped selector that targets a class which is only ever
 * applied via a `class=` prop on a component tag. Fix by wrapping in `:global()`
 * under a scoped ancestor, e.g. `.icon-btn :global(.icon-sun) { … }`.
 *
 * Usage: node scripts/lint-scoped-icons.mjs   (exit 1 on findings)
 */
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
	return readdirSync(dir).flatMap((f) => {
		const p = join(dir, f);
		return statSync(p).isDirectory() ? walk(p) : p.endsWith('.astro') ? [p] : [];
	});
}

const findings = [];

for (const file of walk('src')) {
	const src = readFileSync(file, 'utf8');

	// classes handed to a CHILD COMPONENT (capitalised tag) via class="…"/class={'…'}
	const propClasses = new Set();
	for (const m of src.matchAll(/<([A-Z][\w]*)\b[^>]*?\bclass=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)) {
		for (const c of (m[2] ?? m[3] ?? m[4] ?? '').split(/\s+/).filter(Boolean)) {
			if (!c.startsWith('{')) propClasses.add(c);
		}
	}
	if (!propClasses.size) continue;

	// scoped <style> blocks only (is:global blocks are fine)
	for (const block of src.matchAll(/<style(?![^>]*is:global)[^>]*>([\s\S]*?)<\/style>/g)) {
		const css = block[1];
		for (const cls of propClasses) {
			// every selector mentioning .cls, ignoring ones already wrapped in :global()
			const esc = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			// require a class-name boundary so `.foo` does not match `.foobar`
			const re = new RegExp(`([^{}]*\\.${esc}(?![\\w-])[^{}]*)\\{`, 'g');
			for (const sel of css.matchAll(re)) {
				const selector = sel[1].trim();
				if (new RegExp(`:global\\([^)]*\\.${esc}(?![\\w-])`).test(selector)) continue;
				if (selector.startsWith('@')) continue;
				findings.push({ file, cls, selector: selector.split('\n').pop().trim().slice(0, 90) });
			}
		}
	}
}

if (!findings.length) {
	console.log('scoped-icon lint: clean — every component-passed class is styled with :global()');
	process.exit(0);
}
console.log(`scoped-icon lint: ${findings.length} dead selector(s)\n`);
for (const f of findings) console.log(`  ${f.file}\n    .${f.cls} is passed to a component but styled scoped: ${f.selector}`);
console.log('\nFix: wrap in :global() under a scoped ancestor, e.g. `.parent :global(.the-class) { … }`');
process.exit(1);
