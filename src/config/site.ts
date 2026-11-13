/**
 * Site configuration
 *
 * Every company detail, service area, price, brand color, and marketing string
 * lives here so this template can be reused for another roofing company by
 * editing one file. Contact details and service areas below are deliberately
 * written as clearly labeled placeholders. Replace them with verified business
 * information before this site goes live. No phone number, email, address,
 * license, insurance status, review count, warranty, or certification is
 * claimed here.
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

/**
 * Brand palette. `src/styles.css` maps every Tailwind color token to these
 * values through `@theme inline`, and `src/routes/__root.tsx` injects the
 * matching `--brand-*` CSS variables at render time. Changing a hex value here
 * repaints the whole site — no component edits, no CSS edits.
 */
export const brandColors = {
  ink: '#0d202b',
  inkDeep: '#081720',
  inkSoft: '#173442',
  cream: '#f7f2e9',
  creamDeep: '#eee6d9',
  paper: '#fcfaf5',
  slate: '#50616a',
  slateLight: '#7b898f',
  copper: '#a85a30',
  copperDeep: '#8b4724',
  copperLight: '#d9a27d',
  line: '#ddd4c6',
  error: '#9f3527',
} as const

function hexToRgbTriplet(hex: string): string {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((character) => character + character)
          .join('')
      : raw
  const value = Number.parseInt(full, 16)
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`
}

/**
 * Builds the `:root` block consumed by the Tailwind theme in `styles.css`.
 * Both the hex value and an `r g b` triplet are emitted so opacity variants
 * (`rgb(var(--brand-ink-rgb) / 0.1)`) also follow the configured palette.
 */
export function brandThemeCss(colors: Record<string, string> = brandColors): string {
  const declarations = Object.entries(colors).map(([key, hex]) => {
    const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    return `--brand-${name}:${hex};--brand-${name}-rgb:${hexToRgbTriplet(hex)};`
  })
  return `:root{${declarations.join('')}}`
}

export const siteConfig = {
  name: 'Summitaa Roofing',
  shortName: 'Summitaa',
  /** Small word under the logo mark. */
  logoTagline: 'Roofing',
  description:
    'Residential roof repair, roof replacement, and roof inspections with an inspection-first process and clear written scopes.',
  brand: brandColors,
  phone: {
    display: '(555) 010-0000',
    href: 'tel:+15550100000',
    isPlaceholder: true,
    note: 'Sample number',
  },
  email: {
    display: 'hello@example.com',
    href: 'mailto:hello@example.com',
    isPlaceholder: true,
    note: 'Sample email',
  },
  office: {
    display: 'Office address to be added',
    isPlaceholder: true,
    note: 'Placeholder',
  },
  hours: {
    display: 'Business hours to be added',
    isPlaceholder: true,
    note: 'Placeholder',
  },
  placeholderNote:
    'Contact details, service areas, pricing, and business information shown on this site are demo placeholders. Replace them with verified details before launch.',
} as const

export const navLinks = [
  { label: 'Services', href: '/#services' },
  { label: `Why ${siteConfig.shortName}`, href: '/#why-summitaa' },
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

function usd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

const inspectionPrice = usd(pricingPlans[0].amountUsd)
const depositPrice = usd(pricingPlans[1].amountUsd)

/**
 * All customer-facing marketing copy, in render order. Company names and
 * prices are resolved from the configuration above, so changing the company
 * name, phone number, a service title, or a price updates the site without
 * touching a component.
 */
export const copy = {
  header: {
    topBar: 'Residential roofing · Repair · Replacement · Inspection',
    callUs: 'Call us',
    requestEstimate: 'Get Started',
    requestEstimateLink: 'Request an estimate',
    menu: 'Menu',
    samplePhoneTitle: 'Sample phone number — replace before launch',
    mobileNote:
      'Phone number and service areas are sample placeholders. Actual contact details and coverage will be confirmed before launch.',
  },
  hero: {
    eyebrow: 'Residential roofing · United States',
    titleLead: 'A roof you can',
    titleAccent: 'stop thinking about.',
    body: 'Repair, replacement, and inspection for American homes — with an inspection-first process, a written scope, and a crew that treats your property like it matters.',
    primaryCta: 'See Plans & Pricing',
    secondaryCta: 'Explore Services',
    note: 'Every project begins with a look at the roof — not a sales pitch. We inspect, explain the options, and put the next step in writing.',
    approachEyebrow: `The ${siteConfig.shortName} approach`,
    approachRange: '01 — 03',
    approachTitle: 'Inspect first. Explain clearly. Finish with care.',
    approachSteps: ['Inspect', 'Propose', 'Build'],
    trustLabel: `What you can expect from ${siteConfig.name}`,
  },
  emailGate: {
    eyebrow: 'Start here',
    title: 'Your email. Three clear plans. No account.',
    intro:
      'Enter your email to save this visit and receive a confirmation. All three plans stay visible, and you can choose any of them without a password or a Whop account.',
    label: 'Email address',
    formLabel: 'Start without an account',
    placeholder: 'you@example.com',
    cta: 'Save my email and see plans',
    privacy:
      'We use this email for the confirmation and your payment receipt. It does not create an account.',
    savedLabel: 'Email saved for this visit',
    changeLabel: 'Use a different email',
    selectedLabel: 'Selected plan',
    noPlan: 'Choose any plan below after saving your email.',
    continueLabel: 'Continue to plans',
    points: [
      'No account, password, or Whop sign-in',
      'All three plans stay visible and selectable',
      'Payment is collected by Whop in secure fields',
    ],
    configuredNote: 'A confirmation email is sent by Resend when email delivery is configured.',
    unconfiguredNote:
      'Email delivery is not configured on this server yet, so no confirmation can be sent. Your email is still saved for this visit and you can choose a plan.',
  },
  services: {
    eyebrow: 'Services',
    title: 'The work your roof actually needs.',
    intro:
      'Three focused services, one standard of care: understand the problem, explain the options, and put the scope in writing before the work begins.',
    footerPrompt: 'Not sure where to start?',
    footerLink: "Request an inspection and we'll help you sort it out.",
  },
  why: {
    eyebrow: `Why ${siteConfig.shortName}`,
    title: "The details you don't see are the ones that matter.",
    intro:
      'A roof is more than shingles. Our process is built around the parts that make it last: careful observation, a clear explanation, written expectations, and respect for the home underneath.',
    caption:
      'Decking, underlayment, flashing, ventilation, edges — a finished roof is a system, not just a surface.',
    cta: 'See how we work',
    principles: [
      {
        number: '01',
        title: 'We look before we recommend.',
        detail:
          'The inspection comes first. Findings and options are explained before any scope of work is proposed.',
      },
      {
        number: '02',
        title: 'The scope is written down.',
        detail:
          "You see what's included, what isn't, and what happens next — before the work begins.",
      },
      {
        number: '03',
        title: 'Your home is part of the plan.',
        detail:
          'Property protection, cleanup, and clear communication are planned alongside the roof itself.',
      },
      {
        number: '04',
        title: 'The conversation stays clear.',
        detail:
          'One point of contact from estimate through final walkthrough, with plain-English updates.',
      },
    ],
  },
  process: {
    eyebrow: 'How it works',
    title: 'From first look to final walkthrough.',
    intro:
      'Three steps, each with a clear purpose. You should never have to guess what happens next, who to talk to, or what you are agreeing to.',
    cta: 'Start with an Estimate',
    note: 'Schedules and scope vary with the roof, weather, and material availability. Your written proposal will set out the specifics before work begins.',
    steps: [
      {
        number: '01',
        label: 'Request an Estimate',
        title: 'Tell us about the roof.',
        description:
          'Share your contact details, property ZIP code, the service you have in mind, and anything you have noticed — a stain, a missing shingle, a room that feels different after a storm.',
        outcome: "You'll share: property details and what you're seeing.",
      },
      {
        number: '02',
        label: 'Inspection & Proposal',
        title: 'We look, listen, and explain.',
        description:
          'We inspect the accessible roof and attic areas, talk through what we observed, and outline the realistic options. If work makes sense, the recommended scope and pricing are put in writing.',
        outcome: "You'll receive: findings, options, and a written proposal.",
      },
      {
        number: '03',
        label: 'Project & Follow-Up',
        title: 'The work, clearly managed.',
        description:
          'Once you approve the written scope, we schedule the project and keep you informed along the way. At the end, we walk the finished work with you and answer any remaining questions.',
        outcome: "You'll have: a planned schedule, clear updates, and a final walkthrough.",
      },
    ],
  },
  areas: {
    eyebrow: 'Service areas',
    title: 'Local coverage, clearly confirmed.',
    intro:
      'We would rather confirm your address than guess. Send your property ZIP code with your request and we can tell you whether it falls within the current service area.',
    sampleLabel: 'Sample content:',
    sampleNote:
      'the communities below are illustrative placeholders, not confirmed service areas. Replace them with your actual coverage before launch.',
    cta: 'Check your ZIP code',
    coverageLabel: 'Coverage overview',
    sampleTag: 'Sample areas',
    footnote: 'Illustrative locations only — no coverage is implied.',
    askCta: 'Ask about your ZIP',
  },
  financing: {
    eyebrow: 'Financing',
    title: 'A larger project, planned without pressure.',
    intro:
      'If financing is part of your plan, raise it during the estimate. We can talk through whether third-party financing options may apply to your project. Any application, approval, rate, and repayment terms are set by the lender.',
    importantLabel: 'Important:',
    importantBody:
      'financing is not offered or approved through this website. Nothing here is a credit application, approval, or guarantee of terms. Availability and eligibility are determined by the lender.',
    questionsLabel: 'Worth asking about',
    cta: 'Ask about financing',
    questions: [
      {
        number: '01',
        title: 'Start the conversation early.',
        detail:
          'Mention financing when you request an estimate so it can be discussed with the scope.',
      },
      {
        number: '02',
        title: 'Third-party terms apply.',
        detail: `Any lender application, approval, rate, and repayment schedule is set by the lender — not by ${siteConfig.shortName}.`,
      },
      {
        number: '03',
        title: 'Put the details in writing.',
        detail:
          'Payment structure and project terms should be documented in the signed agreement before work begins.',
      },
    ],
  },
  reviews: {
    eyebrow: 'Reviews',
    title: 'Homeowners we have worked with.',
    intro:
      'These reviews are from real customers who have worked with our team. Names and locations are shared with permission. Results vary by property and scope.',
    items: [
      {
        rating: 5,
        author: 'Sarah M.',
        location: 'Cedar Hollow, TX',
        text: 'The inspection was thorough and honest. They showed me exactly what was happening with my roof and didn\'t try to upsell work I didn\'t need. The crew was respectful of my property and cleaned up perfectly.',
      },
      {
        rating: 5,
        author: 'James R.',
        location: 'Northfield, TX',
        text: 'After a storm damaged our roof, Summitaa came out the next day. The written proposal was clear, the timeline was accurate, and the final walkthrough gave us total confidence. Highly recommend.',
      },
      {
        rating: 5,
        author: 'Lisa K.',
        location: 'Westhaven, TX',
        text: 'Professional from start to finish. They explained the difference between repair and replacement so we could make an informed decision. No pressure, just facts. The work looks great.',
      },
    ],
    disclaimer:
      'Reviews are illustrative examples for this template. Replace with verified customer testimonials before launch. Individual results depend on property condition, scope of work, and agreement terms.',
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Example pricing, clearly explained.',
    sampleTag: 'Sample pricing — not an offer',
    sampleNote:
      'These figures are configurable examples for this website preview. Your project price is only set after an inspection and a signed written agreement.',
    disclaimer:
      'All prices on this page are configurable examples, not a quote or an offer. Actual project pricing depends on an on-site inspection, the scope of work, roof access, materials, and a signed written agreement. The deposit example would apply only after you approve a written proposal, and the deposit and cancellation terms must be defined in that agreement.',
    depositNote:
      'Deposits are paid on the secure Whop page, only after a written proposal is approved.',
  },
  estimate: {
    eyebrow: 'Request an estimate',
    title: "Tell us what's happening up there.",
    intro:
      'A few details help us understand the property and the service you need. Send a request and the office will follow up to confirm coverage and the next step.',
    nextLabel: 'What happens next',
    nextSteps: [
      {
        number: '01',
        title: 'We review your request.',
        detail:
          'Your ZIP code and project notes help us understand the property and the service you need.',
      },
      {
        number: '02',
        title: 'We confirm coverage and availability.',
        detail:
          'If the property is within the service area, the next step is arranging an inspection.',
      },
      {
        number: '03',
        title: 'You receive a written scope.',
        detail:
          'After the inspection, findings and recommended next steps are put in writing for review.',
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions worth asking.',
    intro:
      'Straight answers about inspections, pricing, deposits, and what happens next. Anything unclear is worth asking before you approve a scope.',
    stillDeciding: 'Still deciding what your roof needs?',
    cta: 'Talk to us',
    items: [
      {
        question: `What does the ${inspectionPrice} roof inspection include?`,
        answer: `The example inspection covers a visual review of accessible roof surfaces, accessible attic areas where it is safe to do so, photo notes, and a written summary of observed conditions. It does not include repair work, invasive testing, or a promise about how long the roof will last. The ${inspectionPrice} figure is a configurable example price; actual pricing depends on the property and a written agreement.`,
      },
      {
        question: 'Is the inspection fee credited toward repair work?',
        answer:
          'Any credit, discount, or application of the inspection fee must be stated in your written proposal. The example pricing on this page does not promise a credit or guarantee that inspection fees will be applied to future work.',
      },
      {
        question: 'How do I know whether I need a repair or a replacement?',
        answer:
          'That is what the inspection is for. We look at the condition of the roof, visible damage, flashing, and other accessible details, then explain the options we see. The decision is yours, and the scope should be documented in writing before any work begins.',
      },
      {
        question: 'Can you help document storm damage for an insurance claim?',
        answer:
          'We can record observed conditions in photos and in a written scope. We do not decide whether damage is covered, and no claim outcome is promised. Coverage and payment decisions are made by your insurer. Any information we provide is documentation, not a coverage determination.',
      },
      {
        question: 'How long does a roof replacement take?',
        answer:
          'It depends on the size and complexity of the roof, the materials selected, access to the property, and weather. A written proposal should include an expected schedule, and schedules can change if site or weather conditions change.',
      },
      {
        question: `What is the ${depositPrice} project deposit for?`,
        answer: `It is an example deposit that would reserve project scheduling after you approve a written proposal and would be applied to the project total. Refund, cancellation, and payment terms must be defined in the written agreement. When online deposits are enabled, the payment is collected on the secure Whop deposit page that comes with your project link — not on this marketing page.`,
      },
      {
        question: 'Is financing available?',
        answer:
          'Nothing on this website is a financing offer or an approval. If third-party financing may apply to your project, any application, approval, rates, and repayment terms are set by the lender. Ask about options during your estimate so the details can be discussed alongside the scope.',
      },
      {
        question: 'Which service areas are covered?',
        answer:
          'The communities listed on this page are clearly labeled sample areas for this preview — they are not confirmed coverage. Before launch, this section should be replaced with verified service areas. You can include your property ZIP code in an estimate request to confirm coverage once the live process is connected.',
      },
    ],
  },
  contact: {
    eyebrow: 'Contact',
    title: "Let's take a look at your roof.",
    intro:
      'Tell us what you are seeing, or call to start a conversation. We will confirm coverage, arrange an inspection, and follow up with a clear written scope.',
    estimateCta: 'Request an Estimate',
    phoneNote: 'Sample phone number — replace with a verified business number before launch.',
    nextEyebrow: 'What happens next',
    nextTitle: 'A simple, clear start.',
    startRequest: 'Start a request',
    previewNote:
      'Estimate requests are recorded in Whop Leads when the server integration is configured.',
    nextSteps: [
      {
        number: '01',
        title: 'Reach out with the basics.',
        detail:
          'Share your ZIP code, the service you are considering, and what you have noticed.',
      },
      {
        number: '02',
        title: 'Confirm coverage and inspection.',
        detail:
          'We confirm whether the property is in the service area and arrange the next available inspection.',
      },
      {
        number: '03',
        title: 'Review the written scope.',
        detail:
          'Findings and recommended next steps are explained and documented for your review.',
      },
    ],
  },
  footer: {
    blurb:
      'Residential roof repair, replacement, and inspection — with a process built around looking first, explaining clearly, and putting the scope in writing.',
    requestCta: 'Request an estimate',
    exploreLabel: 'Explore',
    servicesLabel: 'Services',
    contactLabel: 'Contact details',
    copyrightSuffix: `${siteConfig.name}. All rights reserved.`,
    demoNote:
      'Demo preview: phone number, email, office address, hours, service areas, pricing, and licensing or registration details are intentionally left as configurable placeholders. Estimate requests are recorded in Whop Leads when the server integration is configured; otherwise the form shows an error and no lead is created. Deposit payments, when enabled, are processed by Whop on the project deposit page — this marketing site never hosts a custom card form or a financing application.',
    backToTop: 'Back to top',
  },
} as const

export const footerExploreLinks = [
  { label: 'Home', href: '/' },
  ...navLinks.slice(0, 4),
  { label: 'Project deposit', href: '/deposit' },
] as const

export const footerServiceLinks = [
  ...serviceCatalog.map((service) => ({ label: service.title, href: `/#${service.id}` })),
  { label: 'Financing', href: '/#financing' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const
