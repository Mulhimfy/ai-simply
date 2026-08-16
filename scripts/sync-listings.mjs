#!/usr/bin/env node
/**
 * Sync paid directory listings against Polar subscriptions.
 *
 * Any tool in src/content/tools/ that carries a `polarSubscriptionId` in its frontmatter is a
 * paid listing. This script asks Polar whether that subscription is still active:
 *
 *   active / trialing  → leave the listing alone
 *   anything else      → move the markdown file to src/content/tools-archive/
 *
 * Because src/content/tools-archive/ sits outside the tools glob in src/content.config.ts, an
 * archived file disappears from every page, the sitemap, and search at the next build — no
 * per-page filtering needed. Moving rather than deleting means a resubscribe is a `git mv` back.
 *
 * Polar keeps a cancelled subscription in status "active" with cancel_at_period_end=true until
 * the paid period actually ends, and only then flips it to canceled/revoked. So a buyer who
 * cancels today keeps their listing for the rest of the month they paid for, and it comes down
 * automatically on the next run after the period ends.
 *
 * Tools without `polarSubscriptionId` are editorial and are never touched.
 *
 * Usage:
 *   POLAR_ACCESS_TOKEN=polar_oat_… node scripts/sync-listings.mjs [--dry-run]
 */

import { readdir, readFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_DIR = path.join(ROOT, 'src', 'content', 'tools');
const ARCHIVE_DIR = path.join(ROOT, 'src', 'content', 'tools-archive');

const API = process.env.POLAR_API_URL || 'https://api.polar.sh/v1';
const TOKEN = process.env.POLAR_ACCESS_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

/** Subscription states that keep a listing published. */
const LIVE_STATES = new Set(['active', 'trialing']);

/**
 * Safety limit on how many listings one run may remove. Whichever is larger applies, so a
 * small directory can still lose its only lapsed listing while a large one is protected
 * from a credentials fault that makes every lookup fail the same way.
 */
const SAFE_REMOVALS = 3;
const SAFE_REMOVAL_RATIO = 0.34;

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

async function fetchSubscription(id) {
	const res = await fetch(`${API}/subscriptions/${id}`, {
		headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
	});
	if (res.status === 404) return { status: 'not_found' };
	if (!res.ok) {
		throw new Error(`Polar API ${res.status} for subscription ${id}: ${await res.text()}`);
	}
	return res.json();
}

async function main() {
	if (!TOKEN) {
		console.error('POLAR_ACCESS_TOKEN is not set. Create an Organization Access Token in Polar');
		console.error('(Settings → Developers) with the subscriptions:read scope.');
		process.exitCode = 1;
		return;
	}

	const files = (await readdir(TOOLS_DIR)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

	const paid = [];
	for (const file of files) {
		const raw = await readFile(path.join(TOOLS_DIR, file), 'utf8');
		const fm = frontmatter(raw);
		const subId = field(fm, 'polarSubscriptionId');
		if (subId) paid.push({ file, subId, name: field(fm, 'name') || file });
	}

	console.log(`Scanned ${files.length} tools — ${paid.length} paid listing(s) to check.`);
	if (paid.length === 0) return { archived: 0, kept: 0 };

	// Decide everything first, then act. Nothing moves until every lookup is in, so a
	// failure halfway through can't leave the directory half-synced.
	let kept = 0;
	const failures = [];
	const toArchive = [];

	for (const listing of paid) {
		let sub;
		try {
			sub = await fetchSubscription(listing.subId);
		} catch (err) {
			// A transient API failure must never take a paying customer's listing down.
			failures.push(`${listing.file}: ${err.message}`);
			console.error(`  ! ${listing.file} — lookup failed, leaving live: ${err.message}`);
			continue;
		}

		if (LIVE_STATES.has(sub.status)) {
			kept++;
			const pending = sub.cancel_at_period_end
				? ` (cancels at period end ${sub.current_period_end ?? sub.ends_at ?? '?'})`
				: '';
			console.log(`  ✓ ${listing.name} — ${sub.status}${pending}`);
			continue;
		}

		console.log(`  ✗ ${listing.name} — ${sub.status} → archive`);
		toArchive.push({ ...listing, status: sub.status });
	}

	// Circuit breaker. A normal day removes nought or one listing. A large batch means
	// something is wrong with the credentials rather than with the customers — a token
	// scoped to the wrong organisation makes Polar answer 404 for every subscription,
	// which would otherwise read as "everybody cancelled" and wipe the paid directory.
	const limit = Math.max(SAFE_REMOVALS, Math.ceil(paid.length * SAFE_REMOVAL_RATIO));
	if (toArchive.length > limit) {
		console.error(
			`\nREFUSING TO ARCHIVE: ${toArchive.length} of ${paid.length} paid listings came back ` +
			`inactive, over the safety limit of ${limit}.`,
		);
		console.error('That pattern usually means a bad, expired, or wrong-organisation token —');
		console.error('not that every customer cancelled at once. Nothing has been moved.');
		console.error('Verify POLAR_ACCESS_TOKEN, then re-run. Statuses seen:');
		toArchive.forEach(l => console.error(`  - ${l.name}: ${l.status}`));
		process.exitCode = 1;
		return;
	}

	for (const listing of toArchive) {
		if (DRY_RUN) continue;
		await mkdir(ARCHIVE_DIR, { recursive: true });
		await rename(path.join(TOOLS_DIR, listing.file), path.join(ARCHIVE_DIR, listing.file));
	}

	const archived = toArchive.length;
	console.log(`\nKept ${kept}, archived ${archived}${DRY_RUN ? ' (dry run — nothing moved)' : ''}.`);

	if (failures.length) {
		console.error(`\n${failures.length} listing(s) could not be checked:`);
		failures.forEach(f => console.error(`  - ${f}`));
		process.exitCode = 1;
	}

	return { archived, kept };
}

// Set exitCode rather than calling process.exit(): fetch keeps sockets alive briefly, and
// exiting under them aborts the process before the message above is flushed.
main().catch(err => {
	console.error(err);
	process.exitCode = 1;
});
