# Summitaa Roofing — campaign compliance report

**Live site:** https://summitaa.whop.site
**Whop app:** `app_wZYnrCcqbNft8J` · **Account:** `biz_wHs7ScZ5eHIZrH` · **Product:** `prod_UxTHDvkWPVf68`
**Deployed build:** `apbu_PNoDCCkxFCt6I` (production, approved) — unchanged in this review

> Whop serves this app at `summitaa.whop.site`. `summitaa.whop.app` is not
> provisioned and returns 404.

## Status legend

- **VERIFIED** — confirmed by direct evidence (Whop API/CLI/domain record, a
  test, or a live endpoint), not only a UI claim or an HTTP 200.
- **IMPLEMENTED BUT UNVERIFIED** — code is deployed and its error paths are
  tested, but the success path needs a card, a wallet, or an account permission
  that is not available without explicit approval.
- **BLOCKED** — an external constraint prevents completion; the specific
  constraint is named.
- **NOT APPLICABLE** — the requirement's premise does not hold; the reason and
  the compliant alternative are documented.

---

## 1. Requirement → status

| # | Requirement | Status | Evidence |
| - | - | - | - |
| 1 | Live site hosted by Whop | **VERIFIED** | HTTP 200 on `/`, `/deposit`, `/deposit/save-card`; build `apbu_PNoDCCkxFCt6I`, `is_production: true` |
| 2 | English, responsive, US roofing focus | **VERIFIED** | No horizontal overflow at 390 / 768 / 1280 px on `/`, `/deposit`, `/deposit/save-card` |
| 3 | Sections: Repair, Replacement, Inspection, Service Areas, Financing, Reviews/Trust, Contact, Estimate | **VERIFIED** | All rendered on `/`; demo content labeled in `src/config/site.ts` |
| 4 | No invented reviews, certifications, testimonials | **VERIFIED** | Placeholder copy (`isPlaceholder`, `placeholderNote`) and sample service areas only |
| 5 | Company/services/prices editable from central config | **VERIFIED** | `src/config/site.ts` drives Header, Hero, Services, Pricing, Footer; `src/config/whop.ts` holds plan IDs |
| 6 | Real plan: Roof Inspection $149 | **VERIFIED** | `plan_3T6dfuJFNyOLG`, one-time, USD, visible |
| 7 | Real plan: Roofing Project Deposit $500 | **VERIFIED** | `plan_NlxIPUOrmzS6E`, one-time, USD, visible |
| 8 | Real plan: Standard Roof Repair $999 | **VERIFIED** | `plan_EFVJjO467EmuD`, one-time, USD, visible |
| 9 | Whop Payment Elements only | **VERIFIED** | `<Payments>` + `PaymentElement` + `EmailElement` + `BrandingElement`; no Stripe/PayPal/custom card inputs in `src/` |
| 10 | `BrandingElement` present | **VERIFIED** | Branding iframe loads from `cdn.whop.com/elements/.../branding/` on both payment pages |
| 11 | `ExpressCheckoutElement` for wallets | **NOT APPLICABLE** | Exclusive to `<Checkout>` and has no pre-payment callback; see §3.3 |
| 12 | Real sandbox/test Payment Elements checkout | **BLOCKED** | Whop: "The sandbox environment isn't available for Whop Elements yet"; sandbox also says not to use apps; see §2 |
| 13 | No real card / no money moved | **VERIFIED** | No successful payment; invalid tokens return `422` "No charge was made" |
| 14 | `setupFutureUsage="off_session"` on deposit | **VERIFIED** | Present on `<Payments>`; official save-during-checkout path |
| 15 | Card-on-file setup flow | **IMPLEMENTED BUT UNVERIFIED** | `/deposit/save-card` + `POST /api/whop/save-card`; invalid token → `422 card_rejected`; no real card saved |
| 16 | Saved method reference retrieval | **BLOCKED** | Official path is `payment.succeeded` / Setup Intent; production webhook secret is not set (`503 not_configured`) |
| 17 | Whop Invoices API for remaining balance | **BLOCKED (live create)** | Route, math, and guards verified; no invoice created: available key lacks `payment:charge`, legacy path emails on success, CLI item parser fails; see §4 |
| 18 | Manual collection, no auto-charge | **VERIFIED** | Payload uses `collection_method: send_invoice`; no charge code path exists |
| 19 | Estimate form creates a real Whop Lead | **VERIFIED** | Lead `lead_kKXGVRmMm1mPo`, request `est_80b45c52eebe469cb807666ef8a4598a`, `tracked: true` |
| 20 | No fixed/fake user id | **VERIFIED** | Lead uses the OAuth-authenticated user; `/api/leads` rejects anonymous requests |
| 21 | `estimate_requested` event | **VERIFIED** | Whop Events API: 1 event, `evt_est_80b45c52eebe469cb807666ef8a4598a` |
| 22 | `service_viewed` event | **VERIFIED** | Whop Events API: 19 events in the review window |
| 23 | `deposit_started` on deposit start only | **VERIFIED** | Whop Events API: 1 event for 5 `/deposit` page views in the same sample |
| 24 | Pixel installed on the live site | **VERIFIED** | `POST /events/validate_pixel`: `installed: true`, `reachable: true`, `last_seen_days: 0` |
| 25 | Tests: typecheck, unit, leakage, endpoints | **VERIFIED** | `tsc --noEmit` clean; 113 tests / 9 files pass; live endpoint matrix in §6 |
| 26 | Source repo / ZIP | **VERIFIED** | Git commit containing this report + `summitaa-roofing-source.zip` rebuilt from it; archive excludes `node_modules`, `dist`, `.git`, `.dev.vars` |

---

## 2. Priority 1 — Checkout and sandbox

### Findings (official documentation)

From `https://docs.whop.com/developer/guides/sandbox`, section **Elements in the
sandbox**:

> The sandbox environment isn't available for Whop Elements yet. The samples
> below run as written once it is.

From the same page, **Known limitations**:

> **Apps & Messaging** — Don't use apps or messaging features in sandbox.

And on wallet support:

> **Alternative payment methods** — The sandbox supports only card payments (no
> Apple Pay, Google Pay, etc.)

### Compatibility of the current setup

- `<WhopElements elements={loadWhop()}>` runs against production; the only switch
  is `environment="sandbox"`, which the docs say does not work yet.
- Sandbox is a separate account at `sandbox.whop.com` with its own plans and API
  keys. This app, its plans, and its account exist only in production.
- Because the app is a hosted Whop app, the sandbox's "don't use apps" limit
  applies on top of the missing Elements support.

### What was and was not done

- ✅ Live production render verified: `PaymentElement`, `EmailElement`, and
  `BrandingElement` iframes mount; `$500.00` matches plan
  `plan_NlxIPUOrmzS6E`.
- ✅ Token creation and the server call were exercised. An invalid token returns
  `422 payment_rejected` with "No charge was made".
- ❌ No successful charge. No real card was used. No test card path exists for
  Elements today.

### Official alternatives

1. Wait for `environment="sandbox"` support in Whop Elements, then run the same
   page against a sandbox account and test card `4242 4242 4242 4242`.
2. With the account owner's explicit written approval, run one production
   checkout with a real card and refund it.
3. Keep the current no-charge demonstration: element render + token creation +
   controlled failure.

No fake payment path was added to simulate success.

---

## 3. Priority 2 — Card on file

### 3.1 Is `setupFutureUsage="off_session"` enough?

Yes, for the two documented flows:

| Flow | What Whop requires | Current implementation |
| - | - | - |
| Save during the $500 checkout | `setupFutureUsage: "off_session"` on the `Payments` handle; the element records consent on the confirmation token; the payment vaults the method | Present on `/deposit` |
| Save without charging | Elements in `mode="setup"` + a Setup Intent created from the confirmation token | Present on `/deposit/save-card` + `POST /api/whop/save-card` |

No additional server-side flag is needed for the save-during-checkout flow: the
docs' example creates the payment with `account_id`, `variant_id`,
`confirmation_token`, and `return_url` only. The method is vaulted when the
consent is attested on the token.

### 3.2 Reference retrieval and safety

- The saved method's reference is `payt_...`, delivered on `payment.succeeded`
  (save during checkout) or on the Setup Intent (setup mode). Whop stores the
  method; the site never stores or logs a card number, CVV, or expiry.
- `getSetupIntentStatus()` reads `payment_method_id` but the public route does
  not return it; the return page only exposes status booleans.
- The webhook route forwards the exact verified payload to an operator endpoint
  when configured, so `payment_method_id` is preserved there.
- **Blocker:** production has no `WHOP_WEBHOOK_SECRET` (live route returns
  `503 not_configured`), so `payment.succeeded` cannot be verified or consumed
  today. Until it is set, the merchant reads the saved method in Whop.
- Webhook management needs an API-key login with `developer:manage_webhook`;
  the current CLI session is OAuth-only and was refused for that scope.

### 3.3 `ExpressCheckoutElement` decision

- Official constraint: it mounts **only** inside `<Checkout>` and is the
  exclusive alternative to `CheckoutElement` in that handle. `PaymentElement`
  is the other allowed option in the campaign.
- The element exposes only `onLoaderStart`, `onReady`, and `onError`. There is no
  pre-payment callback, so `deposit_started` — which must fire when the deposit
  starts — could not be emitted on a wallet purchase. Adding it would create an
  untracked second payment surface.
- The domain record for `summitaa.whop.site` reports `apple_pay.state: "ready"`,
  so the prerequisite is met, but wallet rendering and payment were **not**
  verified on any device and are **not claimed**.
- Decision: keep the single `PaymentElement` flow where tracking and server-side
  amount checks are reliable; document the exclusion instead of shipping an
  unverified path.

---

## 4. Priority 3 — Final invoice

### 4.1 What the code does

`POST /api/whop/final-invoice` (operator bearer, constant-time compare,
same-origin) takes `projectTotalCents` and an explicit `depositCreditCents`,
computes `balanceDueCents`, builds a project line and a negative deposit-credit
line, and calls the Invoices API with `collection_method: "send_invoice"`.

| Check | Result |
| - | - |
| Foreign origin | `403 forbidden` |
| No bearer token | `401 unauthorized` |
| Missing amount | `400 invalid_input` with field errors |
| Credit > total | `400 credit_exceeds_total` |
| Math and limits | Covered by `tests/invoice.test.js`; balance = total − explicit credit, minimum 50¢, currency must match, due date 1–90 days |
| Auto-charge | None. No saved method is attached and no charge call exists |

### 4.2 Why no live invoice was created

1. **The available account API key lacks `payment:charge`.** `POST /invoices`
   with `Api-Version-Date: 2026-10-24` returns
   `403 Company API key is not authorized for the payment:charge scope`.
   The site's own `/api/whop/final-invoice` route uses the legacy invoices path
   described in point 2, so it was not used for this test.
2. **Legacy API emails by design.** The docs' comparison table says legacy
   invoices are emailed by Whop, while native invoices are only emailed on an
   explicit Send. Calling the legacy route's success path would email a real
   address, so it was deliberately not invoked.
3. **CLI cannot build the item list.** `whop invoices create` (CLI 0.30.0)
   rejects every `items` object with `invalid_union` at `items.0`, reproduced
   with two valid plans (`plan_NlxIPUOrmzS6E`, `plan_53arhuP2hflnI`) and the
   documented `{"variant_id": "plan_..."}` shape. This is a CLI validation bug,
   not an API rejection.

### 4.3 Safe way to finish it (account owner)

- Create a draft in the Whop dashboard **Invoices** tab (drafts charge nothing
  and email nobody), or
- Grant a credential with `payment:charge` and call `POST /invoices` with
  `Api-Version-Date: 2026-10-24`, `items: [{ "plan_id": "...", "quantity": 1 }]`,
  and leave the result in `draft` status so Whop emails nobody.

No invoice was created, sent, or charged in this review.

---

## 5. Priority 4 — Pixel evidence (Whop systems, not just HTTP 200)

Verified with the official Events API through the Whop CLI, which reads the
same records as https://whop.com/dashboard/events.

**Visitor:** `wuid_0d6p614a1x5j5h6x6l5n`

| Event | Count in review window | Stored identifier |
| - | - | - |
| `pixel.custom: estimate_requested` | 1 | `biz_wHs7ScZ5eHIZrH:evt_est_80b45c52eebe469cb807666ef8a4598a` |
| `pixel.custom: service_viewed` | 19 | e.g. `…:evt_service_viewed_239e8c24c9d44ffb81ad0c81d8cc113b` |
| `pixel.custom: deposit_started` | 1 | `biz_wHs7ScZ5eHIZrH:evt_deposit_started_27aa8ceffa244f288ee0617ee0e9fa13` |

The same visitor had **5 `pixel.page` events on `/deposit`** but only **1
`deposit_started`**, which confirms the event fires on the pay press rather than
on page view.

`POST /events/validate_pixel` for `https://summitaa.whop.site` returned:

```json
{ "installed": true, "reachable": true, "last_seen_days": 0, "firing_data_ok": true }
```

The stored identifiers keep the exact `event_id` the site sent, so the events
are deduplicable and attributable. They also appear on the dashboard Events
page for the account.

---

## 6. Verification matrix

| Check | Result |
| - | - |
| `GET /` | 200 |
| `GET /deposit?project=TEST-0001` | 200, all three element iframes, `$500.00` |
| `GET /deposit/save-card` | 200, setup-mode form, "no charge" copy |
| `POST /api/whop/deposit` (invalid token) | `422 payment_rejected`, no charge |
| `POST /api/whop/save-card` (invalid token) | `422 card_rejected`, nothing saved |
| `GET /api/whop/save-card` (fake id) | `422 setup_unavailable` |
| `POST /api/whop/final-invoice` | `403` / `401` / `400` as designed |
| `POST /api/whop/webhook` (unsigned) | `503 not_configured` (secret absent) |
| `GET /api/auth/whop/session` | `{"signedIn":true,...}` |
| `bun run typecheck` | clean |
| `bun test` | 113 pass, 0 fail, 355 assertions, 9 files |
| Key scan | No API key or `.dev.vars` value in `src/`, `public/`, or `dist/whop-build.zip` |
| Log scan | `console.*` calls log only status/code/method — no card data, tokens, or emails |
| Domain record (`domains list`) | `summitaa.whop.site`: `status: ready`, `apple_pay: ready`, `pixel: ready` |

---

## 7. What remains for the account owner

1. **Rotate the account API key** in the Whop dashboard (Developer → API keys).
   Production does not use it (the hosted proxy signs outbound calls), but it
   was displayed during setup.
2. **Set up webhooks:** create an endpoint for
   `https://summitaa.whop.site/api/whop/webhook` with an API-key login that has
   `developer:manage_webhook`, then set `WHOP_WEBHOOK_SECRET` as an app secret.
   This enables verified `payment.succeeded`, `setup_intent.succeeded`, and the
   `payment_method_id` reference.
3. **Create the draft invoice** in the dashboard Invoices tab, or grant
   `payment:charge` and use the native API shape in §4.3.
4. **Decide on a real checkout test.** Only with explicit approval; otherwise
   wait for Whop sandbox Elements.
5. Optional: set `WHOP_ENABLE_FINAL_INVOICE=false` when the invoice route is not
   in use.

---

## 8. Implemented Whop features (one paragraph)

This project is a Whop-hosted app (`app_wZYnrCcqbNft8J`) that sells three real
one-time products — a $149 roof inspection, a $500 project deposit, and a $999
flat-rate roof repair — through Whop Payment Elements, mounting `<Payments>` with
`PaymentElement`, `EmailElement`, and the required `BrandingElement` so card data
stays inside Whop's PCI-isolated fields while the server charges only the
server-configured plan from a single-use confirmation token. It implements Whop
OAuth 2.1 with PKCE and a signed HttpOnly session so estimate requests create
real Whop Leads tied to the signed-in user, fires three custom Whop Pixel
conversion events (`estimate_requested`, `service_viewed`, `deposit_started`)
with deduplicable event ids verified through the Whop Events API, implements
card-on-file with a Whop Setup Intent (`setupFutureUsage="off_session"` on the
deposit plus a separate setup-mode page), and implements the remaining-balance
bill through the Whop Invoices API with an explicit deposit credit, using manual
`send_invoice` collection rather than unauthorized automatic charging.
