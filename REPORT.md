# Summitaa Roofing — campaign compliance report

**Live site:** https://summitaa.whop.site
**Whop app:** `app_wZYnrCcqbNft8J` · **Account:** `biz_wHs7ScZ5eHIZrH` · **Product:** `prod_UxTHDvkWPVf68`
**Deployed build:** `apbu_GZCyGWJH163r5` (production, approved) — unchanged in this pass
**Invoice draft:** `pay_udLKGPtjzXHqm3` (native test draft, `draft`, `$999.00`, never sent or charged — **not** proof of the site's deposit flow; the live gate rejects it as `deposit_not_paid`)
**Revision 2026-10-29:** commit `ee40064` — invoice link mapping fixed and covered by tests; no deploy, no payment, no secret change. Local test suite: 166 passing.
**Commit:** `ee40064` (`Fix invoice pay_online_url mapping and harden deposit tests`) — local only; not pushed or deployed.

> Whop serves this app at `summitaa.whop.site`. `summitaa.whop.app` is not
> provisioned and returns 404.

## Status legend

- **VERIFIED** — confirmed by direct evidence (Whop API/CLI/domain record, a
  test, or a live endpoint), not only a UI claim or an HTTP 200.
- **IMPLEMENTED BUT UNVERIFIED** — code is deployed and its error paths are
  tested, but the success path still needs an approval, a card, a wallet, or a
  permission that was not available in this review.
- **BLOCKED** — an external constraint prevents completion; the specific
  constraint is named.
- **NOT APPLICABLE** — the requirement's premise does not hold; the reason and
  the compliant alternative are documented.

---

## 1. Requirement → status

| # | Requirement | Status | Evidence |
| - | - | - | - |
| 1 | Live site hosted by Whop | **VERIFIED** | HTTP 200 on `/`, `/deposit`, `/deposit/save-card`; production build; see §9 |
| 2 | English, responsive, US roofing focus | **VERIFIED** | No horizontal overflow at 390 / 768 / 1280 px on `/`, `/deposit`, `/deposit/save-card` |
| 3 | Sections: Repair, Replacement, Inspection, Service Areas, Financing, Reviews/Trust, Contact, Estimate | **VERIFIED** | All rendered on `/`; demo content labeled in `src/config/site.ts` |
| 4 | No invented reviews, certifications, testimonials | **VERIFIED** | Placeholder copy (`isPlaceholder`, `placeholderNote`) and sample service areas only |
| 5 | Company/services/prices editable from central config | **VERIFIED** | `src/config/site.ts` drives Header, Hero, Services, Pricing, Footer; `src/config/whop.ts` holds plan IDs |
| 6 | Real plan: Roof Inspection $149 | **VERIFIED** | `plan_3T6dfuJFNyOLG`, one-time, USD, visible |
| 7 | Real plan: Roofing Project Deposit $500 | **VERIFIED** | `plan_NlxIPUOrmzS6E`, one-time, USD, visible |
| 8 | Real plan: Standard Roof Repair $999 | **VERIFIED** | `plan_EFVJjO467EmuD`, one-time, USD, visible |
| 9 | Whop Payment Elements only | **VERIFIED** | `<Payments>` + `PaymentElement` + `EmailElement` + `BrandingElement`; no Stripe/PayPal/custom card inputs in `src/` |
| 10 | `BrandingElement` present | **VERIFIED** | Branding iframe loads from `cdn.whop.com/elements/.../branding/` on both payment pages |
| 11 | `ExpressCheckoutElement` for wallets | **NOT APPLICABLE** | Mounts only inside `<Checkout>`, is the exclusive alternative to `CheckoutElement`, completes the purchase in one press with no documented confirmation-token step, and exposes only `onLoaderStart`/`onReady`/`onError` on web — no pre-payment callback. The existing `<Payments>` + `PaymentElement` flow already offers Apple Pay/Google Pay tiles; the campaign's wallet requirement does not justify a second purchase path; see §3.3 |
| 12 | Real sandbox/test Payment Elements checkout | **BLOCKED** | Whop: "The sandbox environment isn't available for Whop Elements yet"; sandbox also says not to use apps; see §2 |
| 13 | No real card / no money moved | **VERIFIED** | No successful payment; invalid tokens return `422` and the response states no charge |
| 14 | `setupFutureUsage="off_session"` on deposit | **VERIFIED** | Present on `<Payments>`; official save-during-checkout path |
| 15 | Card-on-file setup flow | **IMPLEMENTED BUT UNVERIFIED** | `/deposit/save-card` + `POST /api/whop/save-card`; invalid token → `422 card_rejected`; no real card saved. Linkage is reported only as `accountLinked`, `buyerLinked`, `paymentMethodOnFile` |
| 16 | Saved method reference retrieval | **BLOCKED** | Code now handles `setup_intent.succeeded/canceled/requires_action` and verifies the echoed `account_id`; production `WHOP_WEBHOOK_SECRET` is still absent (`503 not_configured`) and no card has been saved |
| 17 | Whop Invoices API for remaining balance | **IMPLEMENTED BUT UNVERIFIED** | Route requires a real paid `pay_` deposit and derives the credit from Whop; no paid deposit exists, so the live success path is still unexecuted. The official `pay_online_url` response field is now mapped (with fallbacks) and covered by mocked end-to-end tests; see §4 |
| 18 | Manual collection, no auto-charge | **VERIFIED** | Invoice payload uses `collection_method: send_invoice` **and** `save_as_draft: true`; no charge call exists and the draft is sent manually by an operator |
| 19 | Estimate form creates a real Whop Lead | **VERIFIED** | Lead `lead_kKXGVRmMm1mPo`, request `est_80b45c52eebe469cb807666ef8a4598a`, `tracked: true` |
| 20 | No fixed/fake user id | **VERIFIED** | Lead uses the OAuth-authenticated user; `/api/leads` rejects anonymous requests |
| 21 | `estimate_requested` event | **VERIFIED** | Whop Events API: 1 event, `evt_est_80b45c52eebe469cb807666ef8a4598a` |
| 22 | `service_viewed` event | **VERIFIED** | Whop Events API: 19 events in the review window |
| 23 | `deposit_started` on deposit start only | **VERIFIED** | Whop Events API: 1 event for 5 `/deposit` page views in the same sample |
| 24 | Pixel installed on the live site | **VERIFIED** | `POST /events/validate_pixel`: `installed: true`, `reachable: true`, `last_seen_days: 0` |
| 25 | Tests: typecheck, unit, leakage, endpoints | **VERIFIED** | `tsc --noEmit` clean; 166 tests / 13 files / 560 assertions pass; build clean; endpoint matrix in §6 |
| 26 | Source repo / ZIP | **VERIFIED** | Commit `ee40064` plus `summitaa-roofing-source.zip` rebuilt from it; archive excludes `node_modules`, `dist`, `.git`, `.dev.vars`, and secrets |

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

### 3.2 Reference retrieval, linkage, and safety

- The saved method's reference is `payt_...`, delivered on `payment.succeeded`
  (save during checkout) or on the Setup Intent (setup mode). Whop stores the
  method; the site never stores or logs a card number, CVV, or expiry.
- `createSetupIntent()` and `getSetupIntentStatus()` now read `account_id`,
  `member_id`, and `payment_method_id`. The server rejects an intent that echoes
  a different `account_id` (`setup_intent_mismatch`).
- The browser receives only booleans: `accountLinked`, `buyerLinked`, and
  `paymentMethodOnFile`. Member IDs and payment-method references stay on the
  server and are never serialized into a response.
- `src/lib/webhooks.ts` now recognizes `setup_intent.succeeded`,
  `setup_intent.canceled`, and `setup_intent.requires_action` in addition to the
  three payment events. The receiver forwards them like payment events; none is
  treated as a charge.
- **Blocker:** production has no `WHOP_WEBHOOK_SECRET` (live route returns
  `503 not_configured`), so no event can be verified or consumed today. Until it
  is set, the merchant reads the saved method in Whop.
- Webhook management needs an API-key login with `developer:manage_webhook`;
  the current CLI session is OAuth-only and was refused for that scope.

### 3.3 `ExpressCheckoutElement` decision

Reviewed against the current official pages, `@whop/elements@1.9.0`:

| Official statement | Source |
| - | - |
| `ExpressCheckoutElement` "mounts inside [`Checkout`]" and is **exclusive** with `CheckoutElement` in that handle | ExpressCheckoutElement reference |
| It renders one-press Apple Pay / Google Pay / PayPal buttons and "one press finishes the purchase" | ExpressCheckoutElement reference |
| Its web callbacks are only `onLoaderStart`, `onReady`, and `onError`; the purchase callback `onComplete` belongs to `<Checkout>` and fires "after the purchase stands" | ExpressCheckoutElement / Checkout references |
| In the Express Checkout guide, "Whop renders the wallets the device can pay with and **confirms the payment for you**. Your server only listens for the webhook." | Add Express Checkout guide |
| `PaymentElement`'s activation handler calls `payments.createConfirmationToken()`; the token is confirmed **server-side** | PaymentElement reference |
| Both wallets need Apple Pay ready on the page's domain; self-hosted pages serve the association file and register the domain | Enable Apple Pay and Google Pay |

Why it is **NOT APPLICABLE** to this deposit flow:

- It cannot mount in the existing `<Payments>` handle. Adopting it would mean a
  second `<Checkout>` purchase surface alongside the live `PaymentElement` flow.
- It has no pre-payment callback and no documented confirmation-token step on
  the client, so the `deposit_started` event could not fire at the documented
  moment (the pay press), and the server could not run the existing
  account/amount/project checks before accepting the deposit. Fulfillment
  would depend entirely on a webhook that is not configured in production
  today (`503 not_configured`).
- The wallet requirement is already covered by the existing flow:
  `PaymentElement` renders Apple Pay / Google Pay tiles when the domain and
  device support them, while keeping the server-side confirmation and
  verification path. `apple_pay.state` for `summitaa.whop.site` is `ready`, and
  `/.well-known/apple-developer-merchantid-domain-association` returns `200`
  (`text/plain`, 228 bytes). Actual wallet rendering and payment were **not**
  verified on a device and are **not claimed**.
- Decision: keep the single `PaymentElement` flow where tracking, amount checks,
  and deposit verification are reliable. No `ExpressCheckoutElement` code was
  added, and no second purchase path was created.

---

## 4. Priority 3 — Final invoice

### 4.1 What the code does now

`POST /api/whop/final-invoice` (operator bearer, constant-time compare,
same-origin) accepts `projectTotalCents`, the customer fields, and a required
`depositPaymentId` (`pay_...`). It **rejects** any `depositCreditCents` in the
request. The server then:

1. Fetches the payment from Whop (`GET /payments/{id}`).
2. Requires `status` to be paid/succeeded.
3. Requires `account_id` to equal `biz_wHs7ScZ5eHIZrH`.
4. Requires `variant_id` to equal `plan_NlxIPUOrmzS6E`.
5. Requires `metadata.project_ref` to equal the invoice project reference.
6. Requires `subtotal.amount` to equal `WHOP_DEPOSIT_AMOUNT_CENTS` ($500).
7. Requires `subtotal.currency` to equal `WHOP_DEPOSIT_CURRENCY` (usd).

Only then is the Whop subtotal used as the deposit credit. The balance is
`project total − verified deposit`, and the idempotency key includes the
`pay_` reference so two different deposits can never reuse one key. A retry of
the same verified deposit reuses the same key inside Whop's idempotency window,
so it returns the same invoice instead of creating a second one; a `409` is
surfaced as `possible_duplicate` for manual review. A draft is never reported as
sent or paid.

| Check | Result |
| - | - |
| Foreign origin | `403 forbidden` (observed locally and live) |
| No bearer token | `401 unauthorized` (observed locally and live) |
| Missing `depositPaymentId` | `400 invalid_input` (observed locally and live) |
| Client sends `depositCreditCents` | `400 client_supplied_credit` (observed live) |
| Fake `pay_` reference | `422 deposit_not_found` after a real Whop lookup (observed live) |
| Native draft `pay_udLKGPtjzXHqm3` | `422 deposit_not_verified`, reason `deposit_not_paid` (observed live) — the draft cannot be used as a deposit |
| Unpaid / wrong account / wrong plan / wrong project / wrong amount / wrong currency | `422 deposit_not_verified` with a specific reason; covered by unit tests |
| Auto-charge | None. No saved method is attached and no charge call exists |
| Email on creation | None by design: the payload sets `save_as_draft: true`, which Whop documents as creating a draft "without sending or charging" |

### 4.2 Invoice response mapping (fixed 2026-10-29)

The official legacy invoice schema for `POST /invoices` (pinned with
`Api-Version-Date: 2026-09-22`) defines the hosted payment link as
`pay_online_url`:

> `pay_online_url` — The checkout URL where the customer can pay this invoice
> online, with their email address pre-filled and locked.

It does **not** define `invoice_url`, `hosted_url`, or `url`. The previous code
read only those three names, so a real response would have produced an invoice
with a valid `inv_...` id but `url: null`.

`readCreatedInvoice()` in `src/server/whop/invoices.ts` now:

1. Prefers `pay_online_url`.
2. Falls back to `invoice_url`, `hosted_url`, then `url` for compatibility.
3. Supports both a flat response and a nested `{ invoice: { ... } }` envelope.
4. Returns `url: null` — without throwing — when no field is present; the draft
   still exists and can be reviewed by id in Whop.

New tests in `tests/invoice-creation.test.js` cover every shape, the official
field winning when several are present, empty strings, malformed payloads, the
draft-only request payload, the dated API header, the idempotency key, `409`,
`422`, and a transport failure. `tests/final-invoice-route.test.js` proves the
same mapping through the operator route with a mocked paid deposit.

### 4.3 What was actually executed

1. **The gate's failure paths were executed against the real route locally and
   in production.** A fake `pay_` reference returned `422 deposit_not_found`,
   proving the route performs a live Whop payment lookup rather than trusting
   the request. In production, the native draft `pay_udLKGPtjzXHqm3` returned
   `422 deposit_not_verified` with reason `deposit_not_paid`, so the draft is
   explicitly rejected as a deposit.
2. **No paid $500 deposit exists.** Without one, no request can pass the gate,
   so no final invoice was created from this route.
3. **The native draft cannot stand in for this flow.** `pay_udLKGPtjzXHqm3` is a
   `draft`, is not a paid deposit, uses the $999 repair variant rather than the
   $500 deposit plan, and carries no `project_ref` from a real deposit. The live
   gate rejected it with `deposit_not_paid`. It is left untouched; see §4.4.
4. **The legacy route's success path was not executed.** It now creates a draft
   instead of emailing, but that claim rests on Whop's documented
   `save_as_draft` behavior, not on an observed 201.

### 4.4 Draft evidence (not sent, not charged, not proof)

| Check | Result |
| - | - |
| `POST /invoices` (native, OAuth) | `201 Created` in an earlier pass |
| Invoice | `pay_udLKGPtjzXHqm3`, `#00000001`, status `draft` |
| Total / amount due | `$999.00` USD |
| Read back | `GET /invoices/{id}` and `invoices list` return the same draft |
| Metadata | `project_total_cents=149900`, `deposit_credit_cents=50000`, `balance_due_cents=99900` |
| Send / charge / email | None |
| Customer | The account owner's own email; a draft emails nobody |
| Value as proof | **None for the deposit → invoice flow.** It was a non-charging API test only |

The draft is left in place for review. Void it in the dashboard if it is not
wanted.

### 4.5 What is still required to prove the real flow

1. A successful `$500` Payment Elements checkout against
   `plan_NlxIPUOrmzS6E`, with a real card and the owner's explicit approval (or
   Whop sandbox Elements once available).
2. The resulting paid `pay_...` reference and its `project_ref` metadata.
3. One operator call to `POST /api/whop/final-invoice` with that reference. The
   route will verify the payment, compute `$1,499 − $500 = $999`, and create a
   **draft** invoice. Nothing is emailed or charged.
4. The operator reviews the draft in Whop and sends it manually.

No invoice was sent or charged in this review.

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
| `GET /api/whop/save-card` (fake id) | `422 setup_unavailable` (live lookup) |
| `POST /api/whop/final-invoice` (foreign origin) | `403 forbidden` (live) |
| `POST /api/whop/final-invoice` (no bearer) | `401 unauthorized` (live) |
| `POST /api/whop/final-invoice` (missing payment) | `400 invalid_input` (live) |
| `POST /api/whop/final-invoice` (client credit) | `400 client_supplied_credit` (live) |
| `POST /api/whop/final-invoice` (fake `pay_`) | `422 deposit_not_found` after a real lookup (live) |
| `POST /api/whop/final-invoice` (native draft) | `422 deposit_not_verified` / `deposit_not_paid` (live) |
| `POST /api/whop/final-invoice` (real paid deposit) | Not run — no paid deposit exists |
| `POST /api/whop/webhook` (unsigned) | `503 not_configured` in production (secret absent); `401 invalid_signature` locally with a secret |
| `POST /api/whop/webhook` (tampered payload) | `401 invalid_signature` (automated test) |
| `POST /api/whop/webhook` (official test event) | `200`, accepted, not forwarded (automated test) |
| `GET /api/auth/whop/session` | `{"signedIn":true,...}` |
| `bun run typecheck` | clean |
| `bun test` | 166 pass, 0 fail, 560 assertions, 13 files |
| `bun run build` | clean; client + SSR + `dist/whop-build.zip` (55 entries; no `.dev.vars`, `.env`, or secret match) |
| Key scan | No API key or `.dev.vars` value in `src/`, `public/`, or `dist/whop-build.zip` |
| Log scan | `console.*` calls log only status/code/method — no card data, tokens, or emails |
| Domain record (`domains list`) | `summitaa.whop.site`: `status: ready`, `apple_pay: ready`, `pixel: ready` |

### 6.1 Automated no-money coverage added on 2026-10-29

| Test file | What it proves |
| - | - |
| `tests/webhook-route.test.js` | `503` without a secret; `401` for unsigned/tampered requests; `400` for signed non-JSON; `200` for all six handled event types and official test events without forwarding; account mismatch and unhandled types ignored; forwarding preserves `x-summitaa-delivery`; `502` when the forward target is invalid or rejects |
| `tests/payment-verification.test.js` | The route's `GET /payments/{id}` lookup reads status, account, plan, project, amount, and currency from Whop; failed/missing/wrong-account payments fail closed; invalid ids never reach the network |
| `tests/invoice-creation.test.js` | `pay_online_url` and fallback mapping; flat and nested responses; draft-only payload; dated API header; stable idempotency key; `409`/`422`/transport errors |
| `tests/final-invoice-route.test.js` | Mocked paid deposit → `201` draft with the official link; retry reuses the key; client credit rejected before lookup; failed/mismatched/missing deposit rejected; invoice `500` → `502 invoice_failed`; `409` → `possible_duplicate`; missing link still `201` with `url: null` |

All four suites call a mocked `fetch`; no request reached Whop and no money
moved.

---

## 7. What remains for the account owner

1. **Rotate the account API key** in the Whop dashboard (Developer → API keys).
   Production does not use it (the hosted proxy signs outbound calls), but it
   was displayed during setup.
2. **Treat app secrets as exposed if a terminal transcript is shared.** The
   `whop apps get` command prints `WHOP_SESSION_SECRET`, `WHOP_OPERATOR_TOKEN`,
   and a preview token. Rotate both values before sharing any recording or log
   that contains that output.
3. **Set up webhooks:** create an endpoint for
   `https://summitaa.whop.site/api/whop/webhook` with an API-key login
   (`whop login --api-key`) that has `developer:manage_webhook`, then set
   `WHOP_WEBHOOK_SECRET` as an app secret. The current OAuth session was refused
   with `403` ("requires an API-key login"), so this session could not create or
   update the endpoint, and production has no secret today. Once set, this
   enables verified `payment.succeeded`,
   `setup_intent.succeeded/canceled/requires_action`, and the
   `payment_method_id` reference.
4. **Review the native draft** `pay_udLKGPtjzXHqm3` (`$999.00`, `draft`) and
   void it if it is not wanted. It is not proof of the deposit flow and cannot
   pass the new gate.
5. **Decide on a real `$500` deposit test.** This requires your explicit written
   approval; nothing was charged. The card fee is 2.7% + $0.30 = **$13.80**;
   refunding the $500 returns the principal but not the fee, so the net cost is
   about **$13.80** (3-D Secure adds $0.03; international cards add 1.5%, FX
   1%). A $149 inspection checkout costs about $4.32 but does **not** satisfy
   the $500 deposit gate. This is the one missing input for the live invoice
   proof; otherwise wait for Whop sandbox Elements.
6. Optional: set `WHOP_ENABLE_FINAL_INVOICE=false` when the invoice route is not
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
deposit plus a separate setup-mode page) including `account_id`/`member_id`
linkage checks, and implements the remaining-balance bill through the Whop
Invoices API. The invoice route accepts only a real paid `pay_` deposit,
re-fetches it from Whop, verifies account, plan, project, amount, and currency,
derives the credit from the verified payment, and creates the invoice as a
draft (`save_as_draft: true`) for manual review and collection, mapping the
official `pay_online_url` field (with fallbacks) into the response. No invoice
was sent or charged. The earlier native `$999.00` draft
(`pay_udLKGPtjzXHqm3`) is a separate API test, not proof of this flow.
`ExpressCheckoutElement` was evaluated and documented as not applicable because
it is exclusive to `<Checkout>`, has no pre-payment callback, and would create a
second purchase path outside the verified `<Payments>` flow; Apple Pay / Google
Pay tiles remain available through `PaymentElement`.

---

## 9. Deployment record

- **Before this pass:** `apbu_PNoDCCkxFCt6I`.
- **Change set:** verified-deposit invoice gate; setup-intent webhook events;
  setup-intent account/member linkage booleans; draft-only invoice payload;
  tests and documents.
- **Deployed build:** `apbu_GZCyGWJH163r5` (`status: approved`,
  `is_production: true`, `https://summitaa.whop.site`).
- **2026-10-29 local commit (`ee40064`, not deployed):** fixed the invoice
  response mapping to read the official `pay_online_url`; added four no-money
  test files and expanded the webhook route tests. Final local results:
  `bun test` 166 pass, 0 fail, 560 assertions, 13 files; `bun run typecheck`
  clean; `bun run build` clean, `dist/whop-build.zip` 55 entries with no
  `.dev.vars`/`.env`/secret match. The source archive is rebuilt from this
  commit. Production still runs `apbu_GZCyGWJH163r5`. No push, deploy, payment,
  refund, invoice send, secret change, or permission change was performed.
- **Files changed in this pass:** `src/server/whop/invoices.ts`,
  `tests/invoice-creation.test.js`, `tests/final-invoice-route.test.js`,
  `tests/payment-verification.test.js`, `tests/webhook-route.test.js`, and
  `REPORT.md`.
- **Post-deploy checks (live):** `/`, `/deposit?project=TEST-0001`, and
  `/deposit/save-card` returned 200; the invoice route returned `403` for a
  foreign origin, `401` without a bearer, `400` without a deposit reference,
  `400 client_supplied_credit`, `422 deposit_not_found` for a fake `pay_`, and
  `422 deposit_not_verified`/`deposit_not_paid` for the native draft; the
  unsigned webhook returned `503 not_configured`; a fake setup intent returned
  `422 setup_unavailable`.
- **Not verified after deploy:** a successful paid deposit, a saved card, or a
  created final invoice. No such request was sent because no paid deposit
  exists.
