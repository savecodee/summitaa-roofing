/**
 * Site configuration
 *
 * Every company detail, service area, and price lives here so this template can
 * be reused for another roofing company by editing one file. Contact details and
 * service areas below are deliberately written as clearly labeled placeholders.
 * Replace them with verified business information before this site goes live. No
 * phone number, email, address, license, insurance status, review count,
 * warranty, or certification is claimed here.
 */

import { whopPublicConfig } from './whop'

export type ServiceValue =
  | ''
  | 'roof-repair'
  | 'roof-replacement'
  | 'roof-inspection'
  | 'project-deposit'
  | 'financing-question'
  | 'something-else'

export const siteConfig = {
  name: 'Summitaa Roofing',
  shortName: 'Summitaa',
  description:
    'Residential roof repair, roof replacement, and roof inspections with an inspection-first process and clear written scopes.',
  phone: {
    display: '(555) 010-0000',
    href: 'tel:+15550100000',
    isPlaceholder: true,
  },
  email: {
    display: 'hello@example.com',
    href: 'mailto:hello@example.com',
    isPlaceholder: true,
  },
  office: {
    display: 'Office address to be added',
    isPlaceholder: true,
  },
  hours: {
    display: 'Business hours to be added',
    isPlaceholder: true,
  },
  placeholderNote:
    'Contact details, service areas, pricing, and business information shown on this site are demo placeholders. Replace them with verified details before launch.',
} as const

export const navLinks = [
  { label: 'Services', href: '/#services' },
  { label: 'Why Summitaa', href: '/#why-summitaa' },
  { label: 'Process', href: '/#process' },
  { label: 'Service Areas', href: '/#service-areas' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const

/**
 * The three services shown on the site. Edit titles, copy, and CTAs here; the
 * icon and layout stay in the component layer so swapping companies never
 * requires touching markup.
 */
export const serviceCatalog = [
  {
    id: 'service-roof-repair',
    number: '01',
    title: 'Roof Repair',
    icon: 'repair',
    value: 'roof-repair',
    description:
      'Targeted work for leaks, missing or damaged shingles, flashing, and the small failures that turn into bigger ones.',
    details: ['Leaks and missing shingles', 'Flashing and penetrations', 'Storm-related damage'],
    cta: 'Request a repair',
  },
  {
    id: 'service-roof-replacement',
    number: '02',
    title: 'Roof Replacement',
    icon: 'replacement',
    value: 'roof-replacement',
    description:
      "When repair is no longer the right answer, we'll walk you through replacement options, materials, and a clearly defined scope.",
    details: ['Aging or failing roof systems', 'Full replacement planning', 'Material and detail review'],
    cta: 'Discuss a replacement',
  },
  {
    id: 'service-roof-inspection',
    number: '03',
    title: 'Roof Inspection',
    icon: 'inspection',
    value: 'roof-inspection',
    description:
      'A careful visual review of the roof and accessible attic areas, with photo notes and a written summary of what we observed.',
    details: ['Accessible roof surfaces', 'Attic areas, where safe', 'Photo notes and written summary'],
    cta: 'Schedule an inspection',
  },
] as const

export const serviceOptions: ReadonlyArray<{ value: Exclude<ServiceValue, ''>; label: string }> = [
  { value: 'roof-inspection', label: 'Roof inspection' },
  { value: 'roof-repair', label: 'Roof repair' },
  { value: 'roof-replacement', label: 'Roof replacement' },
  { value: 'project-deposit', label: 'Project deposit / scheduling' },
  { value: 'financing-question', label: 'Financing question' },
  { value: 'something-else', label: 'Something else' },
]

export const serviceCommitments = [
  {
    title: 'Inspection first',
    detail: 'We look at the roof before proposing a scope of work.',
  },
  {
    title: 'Written scope',
    detail: 'Inclusions, exclusions, and next steps are put in writing.',
  },
  {
    title: 'Residential focus',
    detail: 'Repair, replacement, and inspection for homes — not everything else.',
  },
  {
    title: 'Care on site',
    detail: 'Property protection and cleanup are part of the plan.',
  },
] as const

/**
 * Pricing shown on the marketing page. `planId` points at the real Whop plan
 * from `src/config/whop.ts`, so the advertised price and the checkout price
 * cannot drift apart. Change company, services, or prices here.
 */
export type PricingPlan = {
  key: 'inspection' | 'deposit' | 'repair'
  number: string
  name: string
  amountUsd: number
  priceNote: string
  summary: string
  features: readonly string[]
  cta: string
  service: Exclude<ServiceValue, ''>
  featured: boolean
  badge: string
  planId: string
}

export const pricingPlans: ReadonlyArray<PricingPlan> = [
  {
    key: 'inspection',
    number: '01',
    name: 'Roof Inspection',
    amountUsd: 149,
    priceNote: 'One-time inspection fee',
    summary: 'A documented look at the roof before any repair or replacement decision.',
    features: [
      'Visual review of accessible roof surfaces',
      'Accessible attic areas, where safe',
      'Photo notes and a written summary',
      'Does not include repair work or invasive testing',
    ],
    cta: 'Ask about an inspection',
    service: 'roof-inspection',
    featured: true,
    badge: 'Start here',
    planId: whopPublicConfig.plans.inspection,
  },
  {
    key: 'deposit',
    number: '02',
    name: 'Roofing Project Deposit',
    amountUsd: 500,
    priceNote: 'Credited toward the project total',
    summary: 'A scheduling deposit once a written proposal has been approved.',
    features: [
      'Reserves project scheduling after approval',
      'Applied to the total project price',
      'Deposit and cancellation terms belong in the agreement',
      'Paid through the secure Whop deposit link, never on this page',
    ],
    cta: 'Ask about the deposit',
    service: 'project-deposit',
    featured: false,
    badge: 'Project deposit',
    planId: whopPublicConfig.plans.deposit,
  },
  {
    key: 'repair',
    number: '03',
    name: 'Standard Roof Repair',
    amountUsd: 999,
    priceNote: 'Flat-rate, defined scope',
    summary: 'A flat rate for a clearly defined, straightforward repair.',
    features: [
      'Defined scope for a minor, straightforward repair',
      'Labor and materials for that written scope',
      'Site protection and cleanup',
      'Additional work requires a revised scope',
    ],
    cta: 'Ask about a repair',
    service: 'roof-repair',
    featured: false,
    badge: 'Flat rate',
    planId: whopPublicConfig.plans.repair,
  },
]

export const sampleServiceAreas = [
  'Cedar Hollow',
  'Northfield',
  'Millbrook',
  'Westhaven',
  'Stonebridge',
  'Lakeview',
  'Fairmont',
  'Ridgeway',
] as const

export const media = {
  hero: {
    src: '/images/hero-home.jpg',
    srcSet: '/images/hero-home-800.jpg 800w, /images/hero-home.jpg 1600w',
    sizes: '(min-width: 640px) 540px, 92vw',
    alt: 'Craftsman-style home at dusk with a steep, dark shingled roof.',
  },
  craft: {
    src: '/images/roof-craft.jpg',
    srcSet: '/images/roof-craft-800.jpg 800w, /images/roof-craft.jpg 1200w',
    sizes: '(min-width: 640px) 500px, 92vw',
    alt: 'A roofer fastening asphalt shingles with a pneumatic nail gun on a residential roof.',
  },
} as const
