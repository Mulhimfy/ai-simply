#!/usr/bin/env node
/**
 * Sync paid directory listings against Polar subscriptions.
 *
 * A tool in src/content/tools/ is a paid listing if its frontmatter carries either
 * `listingEmail` (the address the buyer paid with) or `polarSubscriptionId`. Publishing a
 * listing only needs the email — Polar does not persist the reference we send to checkout, but
 * it does keep the customer's email, so that address is the one join key that exists on both
 * sides. The sync resolves it to a subscription and writes `polarSubscriptionId` back into the
 * file itself, after which lookups go straight to the id and survive an email change.
 *
 * Either way the question is the same: is that subscription still active?
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
 * Tools with neither field are editorial and are never touched.
 *
 * Usage:
 *   POLAR_ACCESS_TOKEN=polar_oat_… node scripts/sync-listings.mjs [--dry-run]
 */

import { readdir, readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS_DIR = path.join(ROOT, 'src', 'content', 'tools');
const ARCHIVE_DIR = path.join(ROOT, 'src', 'content', 'tools-archive');

const API = process.env.POLAR_API_URL || 'https://api.polar.sh/v1';
const TOKEN = process.env.POLAR_ACCESS_TOKEN;
/** The "briefs" listing product. Override only when testing against a stub API. */
const PRODUCT_ID = process.env.POLAR_PRODUCT_ID || '91d400c7-5776-477e-8a87-aa710b77523f';
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

/** Whole days from today until a YYYY-MM-DD date; negative once it has passed. */
function daysUntil(dateStr) {
	const target = Date.parse(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(target)) return 0;
	const today = new Date();
	const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	return Math.round((target - todayUtc) / 86400000);
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

/**
 * Every subscription ever taken out against the listing product, newest first.
 *
 * Polar does not persist the `reference_id` we append to the checkout URL — it only rides along
 * in the browser URL — so the buyer's email is the one identifier that exists on both sides of
 * the payment. This is what lets a listing be linked by email instead of by hand-copied UUID.
 */
async function fetchProductSubscriptions() {
	const all = [];
	for (let page = 1; ; page++) {
		const url = `${API}/subscriptions/?product_id=${PRODUCT_ID}&limit=100&page=${page}`;
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
		});
		if (!res.ok) {
			throw new Error(`Polar API ${res.status} listing subscriptions: ${await res.text()}`);
		}
		const body = await res.json();
		all.push(...(body.items ?? []));
		const maxPage = body.pagination?.max_page ?? 1;
		if (page >= maxPage || (body.items ?? []).length === 0) break;
	}
	return all;
}

/** email → best subscription for it, preferring a live one over a lapsed one. */
function indexByEmail(subs) {
	const byEmail = new Map();
	for (const sub of subs) {
		const email = sub.customer?.email?.trim().toLowerCase();
		if (!email) continue;
		const existing = byEmail.get(email);
		if (!existing || (!LIVE_STATES.has(existing.status) && LIVE_STATES.has(sub.status))) {
			byEmail.set(email, sub);
		}
	}
	return byEmail;
}

/** Write the resolved subscription id into a listing's frontmatter, under its email. */
async function writeBackSubscriptionId(file, subId) {
	const full = path.join(TOOLS_DIR, file);
	const raw = await readFile(full, 'utf8');
	if (/^polarSubscriptionId:/m.test(raw)) return;
	const updated = raw.replace(
		/^(listingEmail:.*)$/m,
		`$1\npolarSubscriptionId: ${subId}`,
	);
	if (updated === raw) return;
	await writeFile(full, updated);
}

/**
 * Prove the credentials work before trusting any answer Polar gives us.
 *
 * Doubles as a daily canary: with no paid listings yet the run makes no other API call, so
 * without this an expired or revoked token would go unnoticed until the day it actually
 * mattered. Returns false only when the token is definitively rejected — an unexpected status
 * is reported but allowed through, so a change in Polar's API can't wedge the whole sync.
 */
async function verifyToken() {
	let res;
	try {
		res = await fetch(`${API}/subscriptions/?limit=1`, {
			headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
		});
	} catch (err) {
		console.error(`Could not reach the Polar API: ${err.message}`);
		return false;
	}
	if (res.status === 401 || res.status === 403) {
		console.error(`Polar rejected POLAR_ACCESS_TOKEN (HTTP ${res.status}).`);
		console.error('It is expired, revoked, or missing the subscriptions:read scope.');
		console.error('Create a new Organization Access Token in Polar → Settings → Developers');
		console.error('and update the POLAR_ACCESS_TOKEN secret on the repository.');
		return false;
	}
	if (!res.ok) {
		console.warn(`Token check returned HTTP ${res.status}; continuing anyway.`);
		return true;
	}
	console.log('Polar credentials OK.');
	return true;
}

async function main() {
	if (!TOKEN) {
		console.error('POLAR_ACCESS_TOKEN is not set. Create an Organization Access Token in Polar');
		console.error('(Settings → Developers) with the subscriptions:read scope.');
		process.exitCode = 1;
		return;
	}

	if (!(await verifyToken())) {
		process.exitCode = 1;
		return;
	}

	const files = (await readdir(TOOLS_DIR)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

	const paid = [];
	for (const file of files) {
		const raw = await readFile(path.join(TOOLS_DIR, file), 'utf8');
		const fm = frontmatter(raw);
		const subId = field(fm, 'polarSubscriptionId');
		const email = field(fm, 'listingEmail');
		if (subId || email) {
			paid.push({
				file,
				subId,
				email: email?.toLowerCase(),
				graceUntil: field(fm, 'listingGraceUntil'),
				name: field(fm, 'name') || file,
			});
		}
	}

	console.log(`Scanned ${files.length} tools — ${paid.length} paid listing(s) to check.`);
	if (paid.length === 0) return { archived: 0, kept: 0 };

	// One listing call covers every email lookup; ids still resolve individually.
	let byEmail = new Map();
	if (paid.some(l => !l.subId && l.email)) {
		byEmail = indexByEmail(await fetchProductSubscriptions());
		console.log(`Fetched ${byEmail.size} subscriber email(s) for the listing product.`);
	}

	// Decide everything first, then act. Nothing moves until every lookup is in, so a
	// failure halfway through can't leave the directory half-synced.
	let kept = 0;
	const failures = [];
	const toArchive = [];
	const graceExpired = [];

	for (const listing of paid) {
		let sub;
		try {
			if (listing.subId) {
				sub = await fetchSubscription(listing.subId);
			} else {
				sub = byEmail.get(listing.email);
				if (!sub) {
					// Nobody has ever subscribed with that address. What that means depends on
					// whether the listing was published on the promise of payment or before it.
					if (listing.graceUntil) {
						const daysLeft = daysUntil(listing.graceUntil);
						if (daysLeft >= 0) {
							console.log(`  … ${listing.name} — unpaid, ${daysLeft} day(s) of grace left`);
							kept++;
						} else {
							console.log(`  ✗ ${listing.name} — grace ended ${listing.graceUntil}, never paid → archive`);
							graceExpired.push({ ...listing, status: 'grace expired' });
						}
						continue;
					}
					// No grace period was set, so this listing was meant to be paid for already.
					// Treat the miss as a typo rather than a cancellation: removing someone over a
					// mistyped address is worse than leaving it up for a human to notice.
					failures.push(`${listing.file}: no subscription found for ${listing.email}`);
					console.error(`  ! ${listing.name} — no subscription for ${listing.email}, leaving live`);
					continue;
				}
				if (LIVE_STATES.has(sub.status)) {
					await writeBackSubscriptionId(listing.file, sub.id);
					console.log(`    ↳ linked ${listing.email} → ${sub.id}`);
				}
			}
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

	// Grace expiry is deliberately outside the circuit breaker above. Those listings were
	// published on spec and never paid for, so a batch of them lapsing together is the
	// expected outcome of a promotion ending, not the signature of a credentials fault.
	for (const listing of [...toArchive, ...graceExpired]) {
		if (DRY_RUN) continue;
		await mkdir(ARCHIVE_DIR, { recursive: true });
		await rename(path.join(TOOLS_DIR, listing.file), path.join(ARCHIVE_DIR, listing.file));
	}

	const archived = toArchive.length + graceExpired.length;
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
