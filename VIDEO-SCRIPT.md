# Recording script — 3 to 5 minutes

**Goal:** show the live Whop-hosted site, the real plans, Payment Elements, the
real Lead, and the three custom pixel events — while staying honest about the
one thing that is not completed (a real card charge).

**Prep before recording**

1. Open https://summitaa.whop.site in a clean browser window at 1280 px wide.
2. Open DevTools → Network, filter `conversions`. Keep the panel visible.
3. Have a second tab on https://summitaa.whop.site/deposit?project=TEST-0001.
4. Have a third tab on the Whop dashboard Events page
   (https://whop.com/dashboard/events), or a terminal ready with
   `whop events list --account_id biz_wHs7ScZ5eHIZrH --first 50`.
5. Have the repository open at `src/config/site.ts`.
6. Do **not** enter a real card. The demo stops at the pay press.

---

## 0:00 – 0:20 · Intro

**On screen:** homepage hero.

**Say:**
> This is Summitaa Roofing, a live site hosted as a Whop app at
> summitaa.whop.site. It sells three real one-time products — a $149 roof
> inspection, a $500 project deposit, and a $999 flat-rate roof repair — and it
> uses Whop Payment Elements, Whop Leads, Whop Invoices, and the Whop Pixel.

---

## 0:20 – 1:05 · Site tour

**Do:** scroll once through the page, pausing on Services, Service Areas,
Pricing, Financing, Reviews/Trust, Contact.

**Say:**
> The page covers repair, replacement, and inspection, plus service areas,
> financing, pricing, reviews and trust, and the estimate form. Reviews and
> contact details are clearly labeled demo content — nothing here is presented
> as a real customer review or certification. Company name, services, and prices
> all come from one config file, so the campaign can change them without
> touching layout.

**Do:** switch to the editor, change the repair price in `src/config/site.ts`,
save, show the pricing card update, then revert. (Skip if time is tight.)

---

## 1:05 – 1:35 · `service_viewed`

**Do:** clear the Network panel, open a service detail.

**Say:**
> Opening a service fires `service_viewed` through `whop.track`. It fires once
> per service view, not on page load.

**Point at:** the `conversions` request → status 200, request body shows
`"event_name":"service_viewed"` and a unique event id. Then switch to the Whop
dashboard Events page and show the same event id stored as `service_viewed`.

**Say:**
> The 200 only proves the browser sent it. The dashboard reads it back from
> Whop's Events system with the same event id, which is the actual proof.

---

## 1:35 – 2:25 · Estimate → real Whop Lead

**Do:** scroll to the estimate form, fill name, email, phone, service, and a
short message. Press submit. If prompted, complete "Sign in with Whop".

**Say:**
> Whop's Leads API needs a real user id, so the form uses Whop OAuth with PKCE.
> The session stores only the user's id, name, and email in a signed HttpOnly
> cookie — no access tokens.

**Do:** show the success state, then the Network entry for `POST /api/leads`.

**Point at:**
```
{"ok":true,"leadId":"lead_kKXGVRmMm1mPo","tracked":true}
```

**Do:** switch to the Whop dashboard Events page and show
`estimate_requested` with event id `evt_est_80b45c52eebe469cb807666ef8a4598a`.

**Say:**
> That is a real Lead in the Whop dashboard, tied to the signed-in user — not a
> fixed id and not a relabeled event. The same submission fired
> `estimate_requested`, with the request id as its event id so it can be
> deduplicated. Whop stores that exact id, so the event is not just a 200 in the
> browser.

---

## 2:25 – 3:15 · Deposit checkout + `deposit_started`

**Do:** switch to `/deposit?project=TEST-0001`. Show the $500 total, the card
form, and the Whop branding block.

**Say:**
> This is Whop Payment Elements: the Payments element with PaymentElement,
> EmailElement, and the required BrandingElement. There is no Stripe, no PayPal,
> and no custom card form. Card data stays in Whop's PCI-isolated iframes. The
> server charges only the server-configured $500 plan, so the browser cannot
> choose an amount. `setupFutureUsage` lets Whop vault the card with the buyer's
> consent for the final balance.

**Do:** clear Network, press **Pay $500.00** without entering a card.

**Point at:** the `deposit_started` request → 200, then the inline message.

**Say:**
> `deposit_started` fires on the pay press — not on the page visit — before any
> card is read. Because no card was entered, Whop returns a controlled failure:
> "No charge was made." Nothing was charged, and I am not going to claim a
> payment that did not happen.

**Do:** switch to the Whop dashboard Events page and show the same
`deposit_started` event.

**Point at:** the event id
`evt_deposit_started_27aa8ceffa244f288ee0617ee0e9fa13`, the build id in the
body, and the dashboard count: **5** `pixel.page` views of `/deposit` but **1**
`deposit_started` in the same sample.

**Say:**
> That ratio is the point: page views did not fire the conversion. Whop recorded
> exactly one start, on the pay press.

---

## 3:15 – 3:55 · Card on file + final invoice

**Do:** open `/deposit/save-card`. Show "Save card — no charge" and the setup
form.

**Say:**
> This page mounts the elements in setup mode and creates a Whop Setup Intent.
> It saves a payment method and charges nothing. I verified the live route
> rejects an invalid token with a 422, so the route is wired and rejects bad
> input, but I could not save a real card without entering one.

**Do:** show a terminal with the operator route checks:

```
POST /api/whop/final-invoice   (foreign origin) → 403
POST /api/whop/final-invoice   (no bearer)      → 401
POST /api/whop/final-invoice   (credit > total) → 400 credit_exceeds_total
```

**Say:**
> The final-invoice route is operator-only and constant-time token checked. It
> takes the project total and an explicit deposit credit, then builds the
> remaining balance and calls the Whop Invoices API with manual collection. It
> never infers the deposit and never auto-charges a saved card, because
> collection was not authorized.

**Do:** show the native draft in the Whop dashboard Invoices tab, or run
`whop invoices get pay_udLKGPtjzXHqm3`.

**Point at:** status `draft`, total `$999.00`, and the metadata
`project_total_cents=149900`, `deposit_credit_cents=50000`,
`balance_due_cents=99900`.

**Say:**
> This test draft records a $1,499 project minus the $500 deposit: $999 due.
> Whop reads it back as a draft — it was never sent, charged, or emailed. The
> site's legacy route, which prints the total and the negative credit line, was
> not run end-to-end because legacy invoices email on creation. I am not
> claiming that last step.

---

## 3:55 – 4:35 · Tests

**Do:** run in the terminal:

```bash
bun run typecheck
bun test
```

**Say:**
> Typecheck is clean and the suite is 113 passing tests across 9 files: deposit
> math and status handling, invoice validation, OAuth state and PKCE, webhook
> verification, request guards, save-card helpers, and tracking payloads. The
> key scan confirms no API key or `.dev.vars` value is in the source or the
> deploy archive.

---

## 4:35 – 5:00 · Close

**Say:**
> To summarize: the site is live on Whop, the three plans are real, checkout uses
> Whop Payment Elements with the required branding element, estimate requests
> create real Whop Leads through OAuth, Whop's own Events system stores all three
> custom pixel events with deduplicable ids, and a native $999 invoice draft was
> read back from Whop without sending or charging it. The remaining gaps are a
> completed card payment and the legacy two-line invoice, which emails on
> creation. No charge, saved card, or sent invoice is claimed.

---

## Do not say / do not show

- Do not say a payment succeeded, a card was saved, or money moved.
- Do not say the legacy final-invoice route was tested end-to-end; only a
  native draft was created and read back.
- Do not say Apple Pay or Google Pay was tested; only the domain record is
  verified, not wallet rendering or payment.
- Do not show `.dev.vars`, API keys, tokens, or the operator token.
- Do not type a real card number on camera.
- Do not call `summitaa.whop.app`; the live URL is `summitaa.whop.site`.
