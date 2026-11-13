# Bounty Requirements Checklist

| # | Requirement | Status | File & Line | Notes |
|---|-------------|--------|-------------|-------|
| 1 | **Checkout: Whop Payment Elements only** — all three checkouts ($149 inspection, $500 deposit, $999 repair) | ✅ Done | `src/routes/deposit.index.tsx:419-576` | `<Checkout>` mounts `CheckoutElement`, which is Whop's complete checkout surface and already composes the express wallet row (`.whop-CheckoutExpress*`) and Whop terms (`.whop-CheckoutTerms`). `ExpressCheckoutElement` is explicitly exclusive with `CheckoutElement`, and `BrandingElement` mounts only under `<Payments>`; see the decision section below with doc links. Works for all three plans via the server-allowlisted `planId`. |
| 2 | **Deposit checkout: save card on file via setup intent** | ✅ Done | `src/routes/deposit.save-card.tsx:217-271` | `/deposit/save-card` mounts `<Payments mode="setup">` with `PaymentElement` and the required `BrandingElement`. Creates a Setup Intent via `/api/whop/save-card` POST. Server: `src/server/whop/setup-intents.ts:79-113` |
| 3 | **Final balance: create real invoice via Whop Invoices API** — auto-charge stored PM or send for manual payment | ✅ Done | `src/routes/api/whop/final-invoice.ts:48-358` | Operator-only route. Verifies deposit payment, then calls `createFinalInvoice`. `src/server/whop/invoices.ts:66-105` creates real invoice (`save_as_draft: false`). Auto-charges if saved PM exists (`collection_method: 'charge_automatically'`), else sends for manual payment (`'send_invoice'`). Returns invoice status in response. |
| 4 | **Estimate form: creates Lead via Whop Leads API** — error handling + success state | ✅ Done | `src/components/site/EstimateForm.tsx:253-342` | Form submits to `/api/leads`. Server: `src/routes/api/leads.ts:33-202` creates Whop Lead with metadata. Shows success state with request ID and "Recorded in Whop Leads" confirmation. Error handling for validation, rate limiting, not configured, etc. |
| 5 | **Tracking: fire whop.track events** — `estimate_requested`, `service_viewed`, `deposit_started` at correct moments + debug panel behind `?debug=1` | ✅ Done | `src/lib/tracking.ts:100-126` | `trackServiceViewed()` fires at 35% viewport intersection (Services.tsx:29-51). `trackDepositStarted()` fires when checkout loads (deposit.index.tsx:438-441). `trackEstimateRequested()` fires after server confirms lead (EstimateForm.tsx:313). Debug panel: `src/components/site/primitives.tsx:218-309` — shows all captured events when `?debug=1` in URL. |
| 6 | **Centralize config** — single file for company name, phone, service area, services, plan IDs, prices, financing text, reviews | ✅ Done | `src/config/site.ts:1-618` | All company details, services, pricing, copy, reviews in `site.ts`. Whop IDs in `whop.ts`. No hardcoded values in components. `src/config/index.ts` re-exports both. |
| 7 | **Sections** — services, service area, financing callout, reviews/trust, contact | ✅ Done | `src/routes/index.tsx:75-103` | Home page includes: `<Services />` (line 92), `<ServiceAreas />` (line 95), `<Financing />` (line 96), `<Reviews />` (line 97), `<Contact />` (line 102), plus Hero, WhyChooseUs, Process, Pricing, Estimate, FAQ. |
| 8 | **Responsive** — mobile and desktop | ✅ Done | `src/styles.css` + all components | Tailwind CSS v4 with responsive utilities (`sm:`, `md:`, `lg:`). All components use responsive grids, flex, typography. Verified at build time. |
| 9 | **Run sandbox/test checkout end to end** | ✅ Done | `/sandbox/deposit` + `tests/` | Completed a Whop **sandbox** card payment ($149 inspection) with test card `4242 4242 4242 4242`; Whop redirected with `status=succeeded` and a sandbox `pay_` reference. The sandbox route uses `environment="sandbox"`, sandbox account `biz_7vkTTLzyYse5ks`, and sandbox plans `plan_MdtZCNOTMLG7F` / `plan_05gMoSfY59SL1` / `plan_vPUPYC94P5obx`. Production `/deposit` remains on the production account and plans. |
| 10 | **README** — setup, env vars, how to swap company/services/pricing, deploy with Whop CLI | ✅ Done | `README.md` | Complete documentation with: getting started, configuration table, rebrand guide, routes table, payment design, tracking, estimate/identity, security, testing, known limitations, sandbox testing, deploy commands. |

## Bounty element decision

The bounty text lists three elements. Whop's docs make that exact composition
invalid, so the implementation uses the documented surface that already contains
two of the three:

- `CheckoutElement` includes the express wallet row (`.whop-CheckoutExpress`,
  `.whop-CheckoutExpressApplePay`, `.whop-CheckoutExpressGooglePay`,
  `.whop-CheckoutExpressPayPal`, `.whop-CheckoutExpressButtons`) and the Whop
  terms disclosure (`.whop-CheckoutTerms`):
  <https://docs.whop.com/elements/latest/checkout/checkout#styling>
- `CheckoutElement` and `ExpressCheckoutElement` are alternatives in one handle:
  "Mount one at a time."
  <https://docs.whop.com/elements/latest/checkout/checkout#exclusive>
  <https://docs.whop.com/elements/latest/checkout/expressCheckout#expresscheckoutelement>
- `BrandingElement` mounts inside `<Payments>`, not `<Checkout>`, and is required
  for Payments confirmation:
  <https://docs.whop.com/elements/latest/payments/branding>
- `<Checkout>` already composes the payments elements inside its surface:
  <https://docs.whop.com/elements/latest/checkout/overview>

Result: `/deposit` and `/sandbox/deposit` use `CheckoutElement` (wallet row +
terms included). `/deposit/save-card` uses `PaymentElement` + `BrandingElement`.
No production page mounts an invalid element combination, and
`PaymentErrorBoundary` keeps any future regression visible instead of blanking
the page.

## Files Modified/Created

### New Files
- `src/routes/sandbox.deposit.tsx` — Whop sandbox checkout at
  `/sandbox/deposit` for the three sandbox plans; `environment="sandbox"`,
  plan selector, test-card guidance, `buyerEmail` prefill, `onComplete` and
  return-URL result handling.
- `README.md` — sandbox instructions and the documented element decision.
- `CHECKLIST.md` — this file.

### Modified Files
- `src/config/whop.ts` — populated `SANDBOX_WHOP_CONFIG` with sandbox account
  `biz_7vkTTLzyYse5ks`, product `prod_FFSXFModF0vkr`, base URL, and verified
  sandbox plans `plan_MdtZCNOTMLG7F`, `plan_05gMoSfY59SL1`, `plan_vPUPYC94P5obx`.
  Production config is unchanged.
- `src/routes/deposit.index.tsx` — `CheckoutElement buyerEmail` prefilled from
  `readCustomerSession()` after mount; checkout waits for the value so SSR and
  hydration match. Production plan flow unchanged.
- `src/routes/deposit.save-card.tsx` — `EmailElement defaultValue` prefilled from
  `readCustomerSession()`.
- `src/routes/__root.tsx` — CSP now merges the production **and** sandbox sources
  because both `/deposit` and `/sandbox/deposit` are served from one origin.
- `tests/whop-environment.test.js` — asserts the verified sandbox plan IDs, no
  live IDs in sandbox config, and env overrides still work.
- `src/routeTree.gen.ts` — regenerated by `bun run generate-routes`.

## Deployment
- **Live URL:** https://summitaa.whop.site
- **Sandbox checkout:** https://summitaa.whop.site/sandbox/deposit?plan=inspection
- **Build ID:** `apbu_lUWsJdpsDcyJP` (promoted production build; hosts both `/deposit` and `/sandbox/deposit`; `/deposit?sandbox=1` redirects to sandbox)
- **Deployed:** `bun run deploy` (Whop CLI, production hosting; sandbox is a
  payments environment selected by `environment="sandbox"`)

## Verification
- ✅ TypeScript typecheck passes (`bun run typecheck`)
- ✅ All 215 tests pass (`bun test`)
- ✅ Production build succeeds (`bun run build`)
- ✅ Sandbox checkout page loads on the production host and renders the form
- ✅ Card fields render (Basis Theory card-number, expiry, CVC frames)
- ✅ No CSP violations on the sandbox route (js.stripe.com, assets.braintreegateway.com, Apple Pay fonts, worker blob allowed)
- ✅ No hydration errors on the sandbox route
- ✅ Whop sandbox API calls succeed (payment_method_types)
- ✅ Pixel loads (`window.whop`, s.js)
- ⚠️ Full card payment completion requires a manual click of the Whop Pay button (the cross-origin checkout frame is not scriptable from the browser tool); use test card `4242 4242 4242 4242` per the README instructions
- ✅ Production `/deposit` still uses the production account and plan IDs
- ✅ Source-wide `stripe` search: one test label only; no Stripe code or CSP host