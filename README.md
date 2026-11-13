# Summitaa Roofing — Whop-hosted campaign site

A responsive, English-language residential roofing site for a US market, hosted
as a Whop app. It includes a real estimate request that creates a Whop Lead,
Whop Pixel conversion events, a Whop-hosted checkout (`CheckoutElement`, which
already composes the express wallet row and the Whop terms disclosure), a
card-on-file save flow, and an operator-only final-invoice route that creates
real invoices (not drafts).

- **Live site:** https://summitaa.whop.site
- **Whop app:** `app_wZYnrCcqbNft8J`
- **Account:** `biz_wHs7ScZ5eHIZrH`
- **Product:** `prod_UxTHDvkWPVf68`

> `summitaa.whop.app` does not resolve. Whop serves this app at
> `https://summitaa.whop.site`, which is the URL used everywhere in the site.

## Stack

- TanStack Start (React 19, file-based routing) + Vite
- Tailwind CSS v4
- Whop Elements (`@whop/elements`, `@whop/elements-react`) — no Stripe, no custom
  card fields, no card data ever reaches this server
- Deployed with `whop apps deploy` (Cloudflare Workers runtime)

## Getting started

```bash
bun install
cp .env.example .dev.vars   # then fill in local test values
bun --bun run dev           # http://localhost:3000
```

```bash
bun run typecheck
bun test
bun run build
bun run deploy
```

## Configuration

Content and pricing are centralized so the campaign can be edited without
touching layout code:

| File | Contains |
| - | - |
| `src/config/site.ts` | Company name, logo text, phone, email, office, hours, service areas, services, prices, brand colors, all marketing copy, trust text, FAQ, footer copy, reviews/testimonials |
| `src/config/whop.ts` | Public Whop identifiers: app, account, product, plan IDs, site origin |
| `.dev.vars` / app secrets | Server-only keys and tokens (never committed) |

## Rebrand in 5 minutes

This template is designed so another roofing company can be launched by editing
configuration, not components. The only required edits are:

1. **Company details and copy — `src/config/site.ts`**
   - `siteConfig`: `name`, `shortName`, `logoTagline`, `description`, `phone`,
     `email`, `office`, `hours`.
   - `brandColors`: the full palette (`ink`, `cream`, `copper`, `line`, …).
     `src/styles.css` maps every Tailwind color token to these values with
     `@theme inline`, and `src/routes/__root.tsx` injects the matching
     `--brand-*` CSS variables. No CSS or component edit is needed.
   - `serviceCatalog` and `pricingPlans`: service titles, descriptions, prices,
     badges, CTAs.
   - `sampleServiceAreas`: coverage list.
   - `copy`: every marketing string — hero, trust strip, services, why, process,
     service areas, financing, pricing, estimate intro, FAQ, contact, footer,
     reviews. Company names and the inspection/deposit prices inside the copy are
     interpolated from the same config, so they cannot drift.

2. **Whop identifiers — `src/config/whop.ts`**
   - `appId`, `accountId`, `productId`, `baseUrl`, and the three `plans` IDs.
   - Keep each plan's price in Whop identical to `pricingPlans[].amountUsd`; the
     browser never sets the charged amount.

3. **Images — `public/images/`**
   - Replace `hero-home*.jpg` and `roof-craft*.jpg`, or update `media` in
     `src/config/site.ts`. Alt text is config-driven too.

4. **Secrets — `.dev.vars` locally, app secrets in production**
   - Copy `.env.example`, fill in values, never commit them.

5. **Verify**
   ```bash
   bun run typecheck
   bun test
   bun run build
   ```

Changing `siteConfig.name`, `siteConfig.phone.display`, a
`serviceCatalog[].title`, a `pricingPlans[].amountUsd`, or a
`brandColors` hex in `src/config/site.ts` updates the rendered site with no
other file edits. This was verified by changing all five in the config only,
loading the site, then reverting the change.

Public Whop IDs are not secrets. The plan IDs below are the real products used by
the site:

| Plan | ID | Price |
| - | - | - |
| Roof Inspection | `plan_3T6dfuJFNyOLG` | $149 one-time |
| Roofing Project Deposit | `plan_NlxIPUOrmzS6E` | $500 one-time |
| Roof Repair — Flat Rate | `plan_EFVJjO467EmuD` | $999 one-time |
| Demo Final Balance (hidden) | `plan_53arhuP2hflnI` | $2,500 one-time — invoice testing only |

## Routes

Pages:

- `/` — single-page campaign site: hero, services, process, why, service areas,
  **reviews/testimonials**, pricing, financing, FAQ, estimate form, contact
- `/deposit` — production $500 project deposit checkout
  (`CheckoutElement` inside `<Checkout>`; production Whop account and plans)
- `/deposit?plan=inspection` — production $149 roof inspection checkout
- `/deposit?plan=repair` — production $999 flat-rate repair checkout
- `/deposit/return` — server-verified payment status after an off-site step
- `/deposit/save-card` — setup-mode card save; charges nothing
  (`PaymentElement` + `BrandingElement` inside `<Payments>`)
- `/sandbox/deposit?plan=inspection|deposit|repair` — Whop **sandbox** checkout
  for the three test plans. `environment="sandbox"`, sandbox account, sandbox
  plan IDs. Test cards only; no real money. Production `/deposit` is untouched.

API:

| Route | Purpose |
| - | - |
| `POST /api/leads` | Creates a real Whop Lead for anonymous or signed-in visitors |
| `POST /api/events` | Server-side pixel forwarding for custom events |
| `GET /api/auth/whop/start` | Starts Whop OAuth 2.1 + PKCE sign-in |
| `GET /api/auth/whop/callback` | Exchanges the code, sets the signed session cookie |
| `GET /api/auth/whop/session` | Returns the signed-in user (no tokens) |
| `GET /api/whop/deposit-config` | Public, non-secret deposit availability |
| `POST /api/whop/deposit` | Charges the configured deposit plan via confirmation token |
| `GET /api/whop/payment-status` | Authoritative payment status for the return page |
| `POST /api/whop/save-card` | Creates a Whop Setup Intent (no charge) |
| `GET /api/whop/save-card` | Reads authoritative setup status and linkage booleans |
| `POST /api/whop/final-invoice` | Operator-only, verified deposit, real invoice, bearer token |
| `POST /api/whop/webhook` | Signed Whop payment and setup-intent webhooks |

## Payment design

1. **Deposit ($500), Inspection ($149), Repair ($999).** The browser mounts
   `<Checkout>` with `CheckoutElement` only. `CheckoutElement` is the complete
   checkout surface: price summary, email, payment methods, the express wallet
   row, and the Whop terms disclosure. `<Checkout>` opens the checkout session
   itself, so no card data or confirmation token reaches this server. The return
   page calls `/api/whop/payment-status` to read the authoritative status before
   it treats the visit as a sale. The server route `/api/whop/deposit` remains an
   alternate confirmation-token path but is not used by the hosted checkout.

2. **Card on file.** `/deposit/save-card` mounts the payment elements in
   `mode="setup"` with `PaymentElement` and the required `BrandingElement`, and
   creates a Setup Intent (`Api-Version-Date: 2026-10-24`). Nothing is charged.
   The saved method belongs to the buyer in Whop.

3. **Final invoice.** `POST /api/whop/final-invoice` is operator-only. It
   requires the `pay_` reference of a real deposit; the server fetches that
   payment from Whop and verifies the paid status, account, deposit plan,
   project reference, amount, and currency before using it as the credit. The
   balance is `project total - verified deposit`, and the invoice is created as
   a real invoice (`save_as_draft: false`). If a saved payment method exists for
   the project (from the deposit/save-card flow), the invoice is created with
   `collection_method: 'charge_automatically'` and the balance is charged
   immediately. Otherwise, the invoice is sent for manual payment via
   `collection_method: 'send_invoice'`. The invoice status is returned in the
   response for admin/demo verification.

No card number, CVV, or expiry is accepted, logged, or stored by this app.

### Why CheckoutElement, ExpressCheckoutElement, and BrandingElement are not all mounted

The bounty lists `CheckoutElement` (or `PaymentElement`) +
`ExpressCheckoutElement` + `BrandingElement`. Whop's docs make that exact
three-element composition invalid:

- **CheckoutElement already contains the express wallet row and the Whop terms.**
  Its styling table lists `.whop-CheckoutExpress`, `.whop-CheckoutExpressApplePay`,
  `.whop-CheckoutExpressGooglePay`, `.whop-CheckoutExpressPayPal`,
  `.whop-CheckoutExpressButtons`, and `.whop-CheckoutTerms` on the
  `CheckoutElement` page:
  <https://docs.whop.com/elements/latest/checkout/checkout#styling>
- **CheckoutElement and ExpressCheckoutElement are mutually exclusive.**
  CheckoutElement says it "is an alternative to `ExpressCheckoutElement` in this
  Checkout handle. Mount one at a time."
  <https://docs.whop.com/elements/latest/checkout/checkout#exclusive>
  ExpressCheckoutElement says it "shares the checkout's entry slot with the full
  checkout element, so a handle mounts exactly one of the two."
  <https://docs.whop.com/elements/latest/checkout/expressCheckout#expresscheckoutelement>
- **BrandingElement mounts only under `<Payments>`, not `<Checkout>`.**
  <https://docs.whop.com/elements/latest/payments/branding>
  The `<Checkout>` docs describe the payments elements as already "composed
  inside", so a separate BrandingElement cannot be added to this handle:
  <https://docs.whop.com/elements/latest/checkout/overview>

The compliant implementation is therefore:

| Flow | Mounted elements | Why |
| - | - | - |
| `/deposit`, `/sandbox/deposit` | `CheckoutElement` inside `<Checkout>` | Includes the express wallet row (`.whop-CheckoutExpress*`) and Whop terms (`.whop-CheckoutTerms`) |
| `/deposit/save-card` | `PaymentElement` + `BrandingElement` inside `<Payments mode="setup">` | Payments-only elements; `BrandingElement` is required here |

Mounting `ExpressCheckoutElement` next to `CheckoutElement` crashes or is refused
by Whop ("mount one at a time"); mounting `BrandingElement` inside `<Checkout>`
throws because it is a Payments element. Both cases are caught by
`PaymentErrorBoundary` so the page would show a visible error instead of the
payment form. The production build was verified with the compliant composition.

## Tracking

`whop.track` custom events (client-side, via the Whop Pixel):

- `estimate_requested` — after the estimate form is accepted; the request id
  becomes the event id so the client and server copies deduplicate
- `service_viewed` — once per service card per session, when at least 35% of the
  card is visible in the viewport (not on page load)
- `deposit_started` — when a deposit payment actually starts: the pay-button
  press for the embedded form, or the express-checkout completion callback; it
  does not fire on page view

Every event carries a stable `event_id`. The Pixel copy uses `whop.track`; the
server copy is forwarded by `POST /api/events` to the Whop Events API with the
same `event_id`, so Whop stores the event once even though both transports run.

**Debug panel:** Add `?debug=1` to any URL to see a live debug panel showing all
captured `whop.track` events with their payloads.

## Estimate + identity

A homeowner does **not** need a Whop account to request an estimate. The Whop
Leads API only requires `account_id`; `user_id` is optional. The server route
sends `account_id`, `product_id`, `referrer`, and a `metadata` object with the
name, email, phone, optional property address, ZIP, service, notes, and request
ID. When the visitor happens to be signed in with Whop, the server also sends
their `user_id`; anonymous visitors send no `user_id` at all.

The form keeps client and server validation, sanitization, a honeypot, a
minimum-fill-time trap, a stale-form check, and a basic per-IP rate limit
(5 submissions per 10 minutes per Worker isolate). OAuth remains available as an
optional identity link, but it is never required to submit the form. The session
stores only the user id, name, and email in a signed HttpOnly cookie — no access
or refresh tokens.

## Security notes

- `.dev.vars` is git-ignored; only `.env.example` is committed.
- The final-invoice route requires a constant-time bearer token and a same-origin
  request, and is disabled unless `WHOP_ENABLE_FINAL_INVOICE=true`.
- Webhooks are verified against the raw body before parsing.
- Responses never echo secrets, tokens, card data, or raw upstream payloads.
- A source-wide search for `stripe` returns one match: the label
  `Stripe-style secret` in `tests/security.test.js`. No application code imports
  or calls Stripe. Card data is collected inside Whop Elements' PCI-isolated
  frames.
- The CSP merges the production and sandbox source sets from
  `contentSecurityPolicy()` because one hosted origin serves both `/deposit` and
  `/sandbox/deposit`. The sandbox rows add `https://sandbox-api.whop.com` and the
  sandbox PayPal hosts. `js.stripe.com` is not part of Whop's CSP table and is not
  needed for the card fields.
  <https://docs.whop.com/elements/latest/getting-started#content-security-policy>

## Testing

```bash
bun run typecheck   # tsc --noEmit
bun test            # 215 tests / 20 files
```

Tests cover deposit math and status normalization, the verified-deposit invoice
gate, estimate/invoice validation, OAuth state/PKCE helpers, webhook verification
(including setup-intent events), request helpers, save-card identifiers and
return URLs, tracking payload shape, and the production/sandbox Whop separation.

## Known limitations

- No live production charge was submitted. The production form is deployed and
  renders; the Whop **sandbox** checkout at `/sandbox/deposit` is the supported
  test path and renders with working card fields (verified on the deployed build).
- No card has been saved in production. The setup-intent route is live and returns
  a correct `422` for invalid tokens.
- Automatic off-session charging of a saved card requires explicit approval and
  a `payment:charge`-capable credential. The final balance is created as a real
  invoice; auto-charge occurs only when a saved payment method exists for the
  project.
- `GET /events` on the Whop API did not list the custom pixel events; they were
  verified from the pixel request bodies and the build/app IDs they carry.
- Whop Elements' sandbox does not support Apple Pay, Google Pay, or ACH. Card,
  PayPal, and the other methods listed in the sandbox guide are available.

## Sandbox checkout

Whop runs two separate environments. They share no accounts, keys, products, or
webhooks, and their keys look identical. Docs:
<https://docs.whop.com/developer/guides/sandbox>

| Item | Sandbox value |
| - | - |
| Elements environment | `environment="sandbox"` |
| Frontend | `https://sandbox.whop.com` |
| API | `https://sandbox-api.whop.com/api/v1` |
| Account | `biz_7vkTTLzyYse5ks` |
| Product | `prod_FFSXFModF0vkr` |
| Inspection $149 | `plan_MdtZCNOTMLG7F` |
| Deposit $500 | `plan_05gMoSfY59SL1` |
| Repair $999 | `plan_vPUPYC94P5obx` |

### Open and test the sandbox checkout

Whop's CLI only deploys to production ("It acts on production, not the sandbox"),
and `whop apps deploy --help` has no sandbox target. The sandbox is therefore a
**payments environment**, not a second hosting environment: the `/sandbox/deposit`
route is served from the same hosted origin but mounts Elements with
`environment="sandbox"` and the sandbox plan IDs above.

1. Open the sandbox page:
   - <https://summitaa.whop.site/sandbox/deposit?plan=inspection>
   - <https://summitaa.whop.site/sandbox/deposit?plan=deposit>
   - <https://summitaa.whop.site/sandbox/deposit?plan=repair>
2. Confirm the page banner says **Test mode — no real money** and the plan ID
   matches the table above.
3. Pay with a Whop test card:

   | Card | Result |
   | - | - |
   | `4242 4242 4242 4242` | Successful payment |
   | `4000 0000 0000 0002` | Declined payment |
   | `5385 3083 6013 5181` | Requires 3D Secure; enter `Checkout1!` |

   Use any future expiry, any 3-digit CVC, and any billing address. Never enter a
   real card.
4. Whop redirects to `/sandbox/deposit?plan=…&payment=pay_…&status=succeeded`.
   The page shows **Sandbox payment succeeded** and the `pay_` reference. No real
   money moved and no production order was created.
5. Optional API check with the sandbox key:
   `GET https://sandbox-api.whop.com/api/v1/payments/<pay_id>` with
   `Authorization: Bearer <sandbox key>` and `Api-Version-Date: 2026-09-22`.

Local development:

```bash
bun run dev:sandbox   # copies .dev.vars.sandbox to .dev.vars, starts Vite
# open http://localhost:3000/sandbox/deposit?plan=inspection
bun run sandbox:use-live   # restore the live profile
```

The sandbox API key stays in `.dev.vars.sandbox` (git-ignored) and is never sent
to the browser. The hosted sandbox route does not need a server API key because
the `<Checkout>` element opens the sandbox checkout session itself.

### Deploy

```bash
bun run sandbox:use-live   # make sure WHOP_ENV/VITE_WHOP_ENV are production
bun run typecheck
bun test
bun run build
bun run deploy
```

Before promoting a build, confirm the production bundle contains
`VITE_WHOP_ENV:"production"`. `whop apps deploy --preview` uploads without
promoting; `whop apps builds promote <build_id>` promotes later (and is also how
to roll back).