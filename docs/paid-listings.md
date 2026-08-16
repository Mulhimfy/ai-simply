# Paid tool listings

A directory listing is sold as a **$99.99 USD / month Polar subscription**. This doc covers what
happens at checkout, how a lapsed subscription takes a listing down automatically, and the two
things you have to set up before it can go live.

## The buyer's journey

1. **`/submit`, step 1** — the buyer fills in their tool's details. Nothing is charged. On submit
   the details POST to Formspree with `payment-status: not paid yet`, and a reference
   (`AIB-XXXXXXX`) is generated and stored in `sessionStorage`.
2. **`/submit`, step 2** — the price, the recurring nature, and the no-refund policy are shown.
   The checkout button stays disabled until the buyer ticks an explicit acknowledgement. The
   button links to Polar with `?customer_email=…&reference_id=AIB-…` appended.
3. **Polar checkout** — Polar collects payment and redirects to the success URL.
4. **`/submit/success?checkout_id=…`** — confirms the payment, shows the reference, and fires a
   second Formspree POST marked `PAID` carrying the checkout id plus the tool details, so the
   paid submission can be matched to the details captured in step 1.

`/submit/success` is `noindex, nofollow`.

## Publishing a paid listing

Create the tool's markdown in `src/content/tools/` as normal, plus two fields:

```yaml
polarSubscriptionId: 1a2b3c4d-…   # the Polar subscription that pays for this listing
listingRef: AIB-K3F9QZ2           # the reference from the buyer's submission
```

`polarSubscriptionId` is what makes the listing a *paid* one. Tools without it are editorial and
the sync below will never touch them.

## Automatic removal when a subscription ends

`scripts/sync-listings.mjs` runs daily via `.github/workflows/sync-listings.yml`. For every tool
carrying a `polarSubscriptionId` it asks the Polar API about that subscription:

| Polar status                                  | Result                          |
| --------------------------------------------- | ------------------------------- |
| `active`, `trialing`                            | listing stays published         |
| `canceled`, `revoked`, `past_due`, `unpaid`, 404 | file moved to `src/content/tools-archive/` |

`src/content/tools-archive/` sits outside the `tools` glob in `src/content.config.ts`, so an
archived file disappears from every page, comparison, and the sitemap at the next build — no
per-page filtering anywhere. The workflow commits the move, and Vercel redeploys.

**This gives the behaviour promised at checkout.** When a buyer cancels, Polar keeps the
subscription `active` with `cancel_at_period_end: true` until the month they paid for actually
ends, and only then flips it to `canceled`. So the listing stays live for the rest of the paid
month and comes down automatically on the first sync after the period ends.

A resubscribe is `git mv src/content/tools-archive/tool.md src/content/tools/`.

The script decides everything before it moves anything, so a failure part-way through can never
leave the directory half-synced. Two safeguards protect paying customers:

- **The token is checked before anything is trusted.** Each run makes one authenticated call
  first and aborts if Polar rejects the credentials. That also makes the daily run a canary:
  an expired or revoked token surfaces as a failed workflow the next morning rather than on the
  day a customer finally cancels.
- **API errors never remove a listing.** An unreachable or erroring Polar API leaves every
  listing published and exits non-zero, so the workflow fails loudly instead of silently
  deleting. A network blip must not cost a customer their listing.
- **A circuit breaker caps bulk removal.** If more than `max(3, 34%)` of paid listings come back
  inactive in one run, the script archives *nothing* and exits non-zero. A normal day removes
  none or one; a large batch almost always means a bad, expired, or wrong-organisation token
  making Polar answer 404 for everything, which would otherwise read as "everyone cancelled".

Run it by hand with:

```bash
POLAR_ACCESS_TOKEN=polar_oat_… npm run sync-listings -- --dry-run
```

## Setup

Both done as of 2026-08-16:

1. **Checkout link.** `TOOL_LISTING.checkoutUrl` holds the reusable Checkout Link
   `https://buy.polar.sh/polar_cl_K4iTZyJ…`, configured in Polar with success URL
   `https://getaibriefs.com/submit/success?checkout_id={CHECKOUT_ID}`, return URL
   `https://getaibriefs.com/submit`, discount codes off, billing address off, no trial.
   Visiting it mints a fresh single-use session per buyer. **Never** swap it for the
   `polar.sh/checkout/polar_c_…` URL it redirects to — that one is single-use and expires in
   ~24h, which would break the button for everyone after the first buyer.
2. **`POLAR_ACCESS_TOKEN` repo secret** (Organization Access Token, `subscriptions:read`) is set
   on `Mulhimfy/ai-simply`. Without it the daily sync fails and nothing is ever removed. If the
   token was created with an expiry, rotate it before that date and paste the new value into the
   same secret — an expired token makes the workflow fail daily until it is replaced.

Two things worth knowing:

- The Polar product lives under the **`iqplot`** organisation, so that is the name buyers see on
  the checkout page and on their card statement.
- The sync runs at 06:00 UTC and the existing **Daily Rebuild** workflow fires a Vercel deploy
  hook at 07:00 UTC, so a removal reaches the live site within the hour even if Vercel's git
  auto-deploy is not wired up.
