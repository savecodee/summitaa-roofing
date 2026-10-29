import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import appCss from '../styles.css?url'
import { whopPixelBootstrapScript } from '../lib/pixel'

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%230d202b'/%3E%3Cpath d='M11 34 32 16l21 18' fill='none' stroke='%23f7f2e9' stroke-width='3'/%3E%3Cpath d='M17 31v19h30V31' fill='none' stroke='%23f7f2e9' stroke-width='3'/%3E%3Cpath d='M29 50V38h7v12' fill='none' stroke='%23a85a30' stroke-width='3'/%3E%3C/svg%3E"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Summitaa Roofing | Residential Roof Repair, Replacement & Inspection',
      },
      {
        name: 'description',
        content:
          'Summitaa Roofing provides residential roof repair, roof replacement, and roof inspections with an inspection-first process, clear written scopes, and straightforward communication.',
      },
      {
        name: 'theme-color',
        content: '#0d202b',
      },
      {
        property: 'og:title',
        content: 'Summitaa Roofing | Residential Roof Repair, Replacement & Inspection',
      },
      {
        property: 'og:description',
        content:
          'A roof you can stop thinking about. Residential roofing with an inspection-first process and written scopes.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: 'Summitaa Roofing',
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
        <HeadContent />
        {/*
          Official Whop Pixel bootstrap. The account ID is public; no API key or
          customer data is present. The inline queue stub lets tracking calls
          made before the remote script arrives flush in order.
        */}
        <script dangerouslySetInnerHTML={{ __html: whopPixelBootstrapScript() }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
