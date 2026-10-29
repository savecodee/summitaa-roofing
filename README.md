# Summitaa Roofing — Whop-hosted campaign site

A responsive, English-language residential roofing site for a US market, hosted
as a Whop app. It includes a real estimate request that creates a Whop Lead,
Whop Pixel conversion events, Whop Payment Elements checkout, a card-on-file
save flow, and an operator-only final-invoice route.

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
| `src/config/site.ts` | Company name, phone, email, service areas, services, prices, trust copy, FAQ |
| `src/config/whop.ts` | Public Whop identifiers: app, account, product, plan IDs, site origin |
| `.dev.vars` / app secrets | Server-only keys and tokens (never committed) |

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
  reviews/trust (clearly labeled demo content), pricing, financing, FAQ,
  estimate form, contact
- `/deposit` — $500 project deposit checkout with Whop Payment Elements
- `/deposit/return` — server-verified payment status after an off-site step
- `/deposit/save-card` — setup-mode card save; charges nothing

API:

| Route | Purpose |
| - | - |
| `POST /api/leads` | Creates a real Whop Lead; requires a signed-in Whop user |
| `POST /api/events` | Server-side pixel forwarding for custom events |
| `GET /api/auth/whop/start` | Starts Whop OAuth 2.1 + PKCE sign-in |
| `GET /api/auth/whop/callback` | Exchanges the code, sets the signed session cookie |
| `GET /api/auth/whop/session` | Returns the signed-in user (no tokens) |
| `GET /api/whop/deposit-config` | Public, non-secret deposit availability |
| `POST /api/whop/deposit` | Charges the configured deposit plan via confirmation token |
| `GET /api/whop/payment-status` | Authoritative payment status for the return page |
| `POST /api/whop/save-card` | Creates a Whop Setup Intent (no charge) |
| `GET /api/whop/save-card` | Reads authoritative setup status and linkage booleans |
| `POST /api/whop/final-invoice` | Operator-only, verified deposit, draft invoice, bearer token |
| `POST /api/whop/webhook` | Signed Whop payment and setup-intent webhooks |

## Payment design

1. **Deposit ($500).** The browser mounts `<Payments>` with `PaymentElement`,
   `EmailElement`, and the required `BrandingElement`. On pay, it creates a
   confirmation token and posts it to `/api/whop/deposit`. The server charges
   `WHOP_DEPOSIT_PLAN_ID` — the browser cannot choose an amount.
   `setupFutureUsage="off_session"` lets Whop vault the method with the buyer's
   consent for the final balance.
2. **Card on file.** `/deposit/save-card` mounts the payment elements in
   `mode="setup"` and creates a Setup Intent (`Api-Version-Date: 2026-10-24`).
   Nothing is charged. The saved method belongs to the buyer in Whop.
3. **Final invoice.** `POST /api/whop/final-invoice` is operator-only. It
   requires the `pay_` reference of a real deposit; the server fetches that
   payment from Whop and verifies the paid status, account, deposit plan,
   project reference, amount, and currency before using it as the credit. The
   balance is `project total - verified deposit`, and the invoice is created as
   a draft (`save_as_draft: true`) for manual review and collection. Nothing is
   emailed or charged by the site, and the saved card is never charged
   automatically; auto-charging requires explicit authorization.

No card number, CVV, or expiry is accepted, logged, or stored by this app.

## Tracking

`whop.track` custom events (client-side, via the Whop Pixel):

- `estimate_requested` — after the estimate form is accepted; the request id
  becomes the event id so it can be deduplicated server-side
- `service_viewed` — once per service detail open, never on page load
- `deposit_started` — on the deposit pay-button press, before any card entry; it
  does not fire on page view

Events return HTTP 200 from `https://t.whop.tw/conversions` and carry the app,
build, and account IDs. Server-side conversions use `POST /api/events`.

## Estimate + identity

`POST /leads` on the Whop API requires a real `user_id`, so the site implements
"Sign in with Whop" (OAuth 2.1 + PKCE, public client) and creates the Lead with
the signed-in user's ID. The session stores only the user id, name, and email in
a signed HttpOnly cookie — no access or refresh tokens.

## Security notes

- `.dev.vars` is git-ignored; only `.env.example` is committed.
- The final-invoice route requires a constant-time bearer token and a same-origin
  request, and is disabled unless `WHOP_ENABLE_FINAL_INVOICE=true`.
- Webhooks are verified against the raw body before parsing.
- Responses never echo secrets, tokens, card data, or raw upstream payloads.

## Testing

```bash
bun run typecheck   # tsc --noEmit
bun test            # 125 tests / 9 files
```

Tests cover deposit math and status normalization, the verified-deposit invoice
gate, estimate/invoice validation, OAuth state/PKCE helpers, webhook verification
(including setup-intent events), request helpers, save-card identifiers and
return URLs, and tracking payload shape.

## Known limitations

- Whop does not yet offer sandbox Payment Elements for this app, and using a real
  card was out of scope, so a live end-to-end charge has not been completed.
  The checkout, token exchange, and error handling are deployed and exercised up
  to the token step; no charge was attempted and none succeeded.
- No card has been saved in production for the same reason. The setup-intent
  route is live and returns a correct `422` for invalid tokens.
- Automatic off-session charging of a saved card is intentionally not wired: it
  requires explicit approval and a `payment:charge`-capable credential. The
  final balance is created as a draft invoice, reviewed, and sent manually.
- `GET /events` on the Whop API did not list the custom pixel events; they were
  verified from the pixel request bodies and the build/app IDs they carry.
