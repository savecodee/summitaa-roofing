# Summitaa Roofing — campaign submission report

**Live site:** https://summitaa.whop.site
**Whop app:** `app_wZYnrCcqbNft8J` · **Account:** `biz_wHs7ScZ5eHIZrH` · **Product:** `prod_UxTHDvkWPVf68`
**Build:** `apbu_PNoDCCkxFCt6I` (production, approved)

> The campaign text asks for a `whop.app` URL. Whop serves this app at
> **`summitaa.whop.site`**. `https://summitaa.whop.app` returns 404 because that
> host is not provisioned. The live site is the `.whop.site` URL above.

---

## 1. Requirement → status → evidence

| # | Requirement | Status | Evidence |
| - | - | - | - |
| 1 | Live site hosted by Whop | **Done** | `https://summitaa.whop.site` returns HTTP 200; deployed build `apbu_PNoDCCkxFCt6I`, `is_production: true` |
| 2 | English, responsive, US roofing focus | **Done** | No horizontal overflow at 390, 768, and 1280 px, measured on `/`, `/deposit`, and `/deposit/save-card` in 390 px iframes |
| 3 | Sections: Repair, Replacement, Inspection, Service Areas, Financing, Reviews/Trust, Contact, Request an Estimate | **Done** | All present on `/`; demo content is labeled |
| 4 | No invented reviews, certifications, testimonials | **Done** | Reviews/trust block uses labeled sample text and placeholder contact details |
| 5 | Company name, services, prices editable from central config | **Done** | `src/config/site.ts` drives Header, Hero, Services, Pricing, Footer; `src/config/whop.ts` holds plan IDs |
| 6 | Real plan: Roof Inspection $149 | **Done** | `plan_3T6dfuJFNyOLG`, one-time, USD, visible |
| 7 | Real plan: Roofing Project Deposit $500 | **Done** | `plan_NlxIPUOrmzS6E`, one-time, USD, visible |
| 8 | Real plan: Standard Roof Repair $999 flat | **Done** | `plan_EFVJjO467EmuD`, one-time, USD, visible |
| 9 | Whop Payment Elements only (no Stripe/PayPal/custom card form) | **Done** | `/deposit` uses `<Payments>` + `PaymentElement` + `EmailElement` + `BrandingElement`; grep shows no Stripe/PayPal/card-number inputs |
| 10 | `ExpressCheckoutElement` where eligible | **Not applicable** | `ExpressCheckoutElement` is exclusive to `<Checkout>`; the production deposit uses the required `PaymentElement`, whose wallet buttons cover Apple Pay / Google Pay where the host supports them. Adding `<Checkout>` would replace the required element and change the flow. |
| 11 | Required `BrandingElement` | **Done** | Mounted on `/deposit` and `/deposit/save-card`; its iframe loads from `cdn.whop.com/elements/.../branding/` |
| 12 | Real test/sandbox Payment Elements checkout | **Blocked** | Whop does not expose sandbox Elements for this app; a real card is out of scope. The live checkout is exercised through token creation and returns a controlled error ("No charge was made") for an invalid token. No charge was attempted or completed. |
| 13 | Card-on-file: $500 deposit → save method → invoice remaining balance | **Implemented; save blocked** | `setupFutureUsage="off_session"` on the deposit; `/deposit/save-card` + `POST /api/whop/save-card` create a Setup Intent. Live POST with an invalid token returns `422 card_rejected`; no real card was saved. |
| 14 | Whop Invoices API for remaining balance | **Done** | `POST /api/whop/final-invoice` (operator token) builds project total − explicit deposit credit and creates a `send_invoice` invoice; unit-tested, live auth/validation verified |
| 15 | Auto-charge saved method only if authorized/supported | **Deliberately off** | Manual invoice is used; no collection was executed. The saved card is never auto-charged by this code. |
| 16 | No real money charged | **Respected** | No payment succeeded; payment endpoint returns `422 payment_rejected` for invalid tokens |
| 17 | Estimate form creates a real Whop Lead | **Done** | Live Lead `lead_kKXGVRmMm1mPo` from request `est_80b45c52eebe469cb807666ef8a4598a`; response `{"ok":true,...,"tracked":true}` |
| 18 | No fixed/fake user id | **Done** | Lead uses the OAuth-authenticated Whop user id; `/api/leads` rejects anonymous requests |
| 19 | `estimate_requested` event fires | **Done** | Pixel POST → 200, `event_id: evt_est_80b45c52eebe469cb807666ef8a4598a` |
| 20 | `service_viewed` event fires | **Done** | Three separate pixel POSTs → 200 with distinct event ids |
| 21 | `deposit_started` fires on deposit start, not page visit | **Done** | Pixel POST → 200 on pay-button press: `evt_deposit_started_27aa8ceffa244f288ee0617ee0e9fa13`, build `apbu_PNoDCCkxFCt6I`; no event on page load |
| 22 | Tests: build, typecheck, leakage, API, checkout, invoice, events, lead, responsive | **Done** | `tsc --noEmit` clean; `bun test` 113 pass / 0 fail (9 files); live endpoint checks recorded below |
| 23 | Source repo / ZIP | **Done** | `summitaa-roofing-source.zip` (excludes `node_modules`, `dist`, `.git`, `.dev.vars`) |

---

## 2. Live endpoint checks (production build)

| Check | Result |
| - | - |
| `GET /` | 200 |
| `GET /deposit?project=TEST-0001` | 200, `PaymentElement` + `EmailElement` + `BrandingElement` iframes present, `$500.00` |
| `GET /deposit/save-card` | 200, setup-mode elements present, "Save card — no charge" button disabled until ready |
| `POST /api/whop/deposit` (invalid token) | `422 payment_rejected` — "No charge was made" |
| `GET /api/whop/payment-status` (bad id) | `400` |
| `POST /api/whop/save-card` (invalid token) | `422 card_rejected` — nothing charged or saved |
| `GET /api/whop/save-card?setupIntentId=sint_…` (fake) | `422 setup_unavailable` |
| `POST /api/whop/final-invoice` (foreign origin) | `403 forbidden` |
| `POST /api/whop/final-invoice` (no bearer) | `401 unauthorized` |
| `POST /api/whop/final-invoice` (bad body) | `400 invalid_input` with field errors |
| `POST /api/whop/final-invoice` (credit > total) | `400 credit_exceeds_total` |
| `GET /api/auth/whop/session` (signed in) | `{"signedIn":true,"name":"Ahmed gehad","email":"elkory1@icloud.com"}` |

The final-invoice success path was **not** called live: it creates a real invoice
and would email the customer. It is covered by unit tests instead.

---

## 3. Lead evidence

```
request  est_80b45c52eebe469cb807666ef8a4598a
lead     lead_kKXGVRmMm1mPo
response {"ok":true,"leadId":"lead_kKXGVRmMm1mPo","tracked":true}
identity Whop OAuth user (no fixed or shared id)
```

`POST /leads` on the Whop API requires a real `user_id` even though the reference
marks it nullable, so "Sign in with Whop" (OAuth 2.1 + PKCE, public client) is
part of the form flow. The session cookie holds only the user id, name, and
email in a signed, HttpOnly cookie.

---

## 4. Pixel evidence

All three events were captured from production network traffic:

| Event | Event id | Result |
| - | - | - |
| `estimate_requested` | `evt_est_80b45c52eebe469cb807666ef8a4598a` | 200 |
| `service_viewed` | three distinct `evt_service_viewed_*` ids | 200 |
| `deposit_started` | `evt_deposit_started_27aa8ceffa244f288ee0617ee0e9fa13` | 200 |

Each request carries `app_id: app_wZYnrCcqbNft8J`, `app_build_id:
apbu_PNoDCCkxFCt6I`, `company_id: biz_wHs7ScZ5eHIZrH`. `deposit_started` is
emitted only inside the pay handler, after the readiness check and before
`createConfirmationToken()`.

Note: `GET /events` on the Whop API did not return these custom events for the
anonymous visitor id, so verification relies on the captured request bodies and
the build/app identifiers they carry.

---

## 5. Card-on-file design (as built)

```
Deposit page  ── setupFutureUsage="off_session" ──▶  Whop vaults the method
                                                     (only with buyer consent)
Save-card page ── mode="setup" ──▶ POST /api/whop/save-card
                                   └─ Setup Intent (2026-10-24), no charge
Final invoice ── POST /api/whop/final-invoice (operator bearer)
                └─ project total − deposit credit = balance
                └─ collection_method: send_invoice  → manual payment
```

- The site never stores card data; the card lives with Whop and the buyer.
- The deposit credit is always supplied explicitly after reconciliation in Whop.
- Auto-charging a saved method is intentionally not implemented: it needs
  explicit approval and a `payment:charge`-capable credential.

---

## 6. Tests

```
$ bun run typecheck
tsc --noEmit            # clean

$ bun test
113 pass
0 fail
355 expect() calls
Ran 113 tests across 9 files
```

Coverage areas: deposit amounts/status/return-URL/idempotency, confirmation-token
and attempt-id validation, estimate validation and sanitization, invoice math
(deposit credit, minimums, currency, due dates, idempotency keys), OAuth
state/PKCE/nonce/id-token checks, webhook signature verification and event
allow-list, HTTP helpers (bearer, same-origin, body limits), save-card
identifiers and return URLs, and tracking payload shape.

Key-leak check: `src/config/whop.ts` contains only public IDs; no `key_`,
`sk_`, bearer token, or `.dev.vars` value appears in `src/`, `public/`, or the
deploy archive `dist/whop-build.zip`. The archive holds only
`server/index.js` and its source map. `scripts/clean-build.mjs` also removes the
local preview copy at `dist/server/.dev.vars` after each build.

---

## 7. Deliverables

| Item | Location |
| - | - |
| Live site | https://summitaa.whop.site |
| Source ZIP | `summitaa-roofing-source.zip` |
| Report | this file (`REPORT.md`) |
| Recording script | `VIDEO-SCRIPT.md` |
| One-paragraph Whop summary | §8 below |

---

## 8. Whop features implemented (one paragraph)

This project is a Whop-hosted app (`app_wZYnrCcqbNft8J`) that sells three real
one-time products — a $149 roof inspection, a $500 project deposit, and a $999
flat-rate roof repair — through Whop Payment Elements, mounting `<Payments>` with
`PaymentElement`, `EmailElement`, and the required `BrandingElement` so card data
stays inside Whop's PCI-isolated fields, while the server charges only the
server-configured plan from a single-use confirmation token. It implements Whop
OAuth 2.1 with PKCE and a signed HttpOnly session so estimate requests create
real Whop Leads tied to the signed-in user, fires three custom Whop Pixel
conversion events (`estimate_requested`, `service_viewed`, `deposit_started`)
with deduplicable event ids, saves a card for future use with a Whop Setup Intent
(`setupFutureUsage="off_session"` on the deposit plus a separate setup-mode
page), and creates the remaining-balance bill through the Whop Invoices API with
an explicit deposit credit, using manual `send_invoice` collection rather than
unauthorized automatic charging.

---

## 9. Open items / manual steps

1. **Rotate the account API key** in the Whop dashboard (Settings → API keys).
   It was displayed once during setup, so treat it as exposed. Production does
   not use it: the hosted app reaches Whop through the auto-signed outbound
   proxy, and local development reads `.dev.vars`.
2. **Complete a live card test** when a test card or sandbox Elements become
   available; until then no payment or saved card is claimed.
3. If automatic off-session charging is approved later, grant a
   `payment:charge`-capable credential and add a charge step after the invoice
   is issued; the current code deliberately stops at manual payment.
