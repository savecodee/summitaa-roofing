import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import appCss from '../styles.css?url'
import { whopPixelBootstrapScript, WHOP_PIXEL_SCRIPT_URL } from '../lib/pixel'
import { contentSecurityPolicy } from '@whop/elements'
import { brandColors, brandThemeCss, siteConfig } from '@/config'
import { DebugPanel } from '../components/site/primitives'

const FAVICON = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='${brandColors.ink}'/><path d='M11 34 32 16l21 18' fill='none' stroke='${brandColors.cream}' stroke-width='3'/><path d='M17 31v19h30V31' fill='none' stroke='${brandColors.cream}' stroke-width='3'/><path d='M29 50V38h7v12' fill='none' stroke='${brandColors.copper}' stroke-width='3'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})()

const PAGE_TITLE = `${siteConfig.name} | Residential Roof Repair, Replacement & Inspection`

// Whop Elements require the hosted frames, SDK, and wallet origins in the page
// CSP. One hosted origin serves both the production checkout (/deposit) and the
// sandbox checkout (/sandbox/deposit), so the policy must allow both Whop API
// origins. The docs list the sandbox sources separately:
// https://docs.whop.com/elements/latest/getting-started#content-security-policy
const productionWhopCsp = contentSecurityPolicy({
  environment: 'production',
  wallets: true,
  bankConnections: false,
})
const sandboxWhopCsp = contentSecurityPolicy({
  environment: 'sandbox',
  wallets: true,
  bankConnections: false,
})
// The docs table lists `https://assets.braintreegateway.com` in `script-src`
// for wallets, but the installed Elements helper omits it. Stripe's Basil
// script and Apple Pay's web fonts are loaded by Elements at runtime and are
// not in the table, so they are listed here to keep card/wallet rendering from
// being blocked:
// https://docs.whop.com/elements/latest/getting-started#content-security-policy
const extraCspSources =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://t.whop.tw https://assets.braintreegateway.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.paypalobjects.com; font-src 'self' data: https://applepay.cdn-apple.com; connect-src 'self' https://api.whop.com https://t.whop.tw; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; frame-src 'self' https://js.stripe.com"
const contentSecurityPolicyValue = sandboxWhopCsp.merge(
  productionWhopCsp.merge(extraCspSources),
)

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        httpEquiv: 'Content-Security-Policy',
        content: contentSecurityPolicyValue,
      },
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: PAGE_TITLE,
      },
      {
        name: 'description',
        content: siteConfig.description,
      },
      {
        name: 'theme-color',
        content: brandColors.ink,
      },
      {
        property: 'og:title',
        content: PAGE_TITLE,
      },
      {
        property: 'og:description',
        content: siteConfig.description,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: siteConfig.name,
      },
      {
        name: 'twitter:card',
        content: 'summary',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: FAVICON,
      },
      {
        rel: 'preconnect',
        href: 'https://t.whop.tw',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Brand palette from `siteConfig.brand` — the Tailwind theme in
            `styles.css` resolves every color token to these variables. */}
        <style dangerouslySetInnerHTML={{ __html: brandThemeCss() }} />
        <HeadContent />
        {/*
          Official Whop Pixel bootstrap. The account ID is public; no API key or
          customer data is present. The inline queue stub lets tracking calls
          made before the remote script arrives flush in order.
        */}
        <script dangerouslySetInnerHTML={{ __html: whopPixelBootstrapScript() }} />
        <script async src={WHOP_PIXEL_SCRIPT_URL} />
      </head>
      <body>
        {children}
        <Scripts />
        <DebugPanel />
      </body>
    </html>
  )
}
