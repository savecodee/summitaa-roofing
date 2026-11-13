import { copy, footerExploreLinks, footerServiceLinks, siteConfig } from '@/config'
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Mail,
  MapPin,
  Phone,
} from './icons'
import { ButtonLink, Container, Eyebrow, Logo } from './primitives'

const contactItems = [
  {
    label: 'Phone',
    value: siteConfig.phone.display,
    icon: Phone,
    href: siteConfig.phone.href,
    note: siteConfig.phone.note,
  },
  {
    label: 'Email',
    value: siteConfig.email.display,
    icon: Mail,
    href: siteConfig.email.href,
    note: siteConfig.email.note,
  },
  {
    label: 'Office',
    value: siteConfig.office.display,
    icon: MapPin,
    href: undefined,
    note: siteConfig.office.note,
  },
  {
    label: 'Hours',
    value: siteConfig.hours.display,
    icon: Clock,
    href: undefined,
    note: siteConfig.hours.note,
  },
] as const

export function Contact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative overflow-hidden bg-ink text-cream"
    >
      <div
        className="roof-shingle-lines pointer-events-none absolute inset-y-0 right-0 w-[46%] opacity-50"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-0 size-[420px] rounded-full bg-copper/[0.06] blur-3xl"
        aria-hidden="true"
      />
      <p
        className="text-outline-light pointer-events-none absolute -bottom-6 right-0 hidden select-none font-display text-[11rem] font-medium uppercase leading-none tracking-[0.05em] lg:block"
        aria-hidden="true"
      >
        {siteConfig.shortName}
      </p>

      <Container className="relative py-20 sm:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
          <div>
            <Eyebrow tone="light">{copy.contact.eyebrow}</Eyebrow>
            <h2
              id="contact-heading"
              className="mt-5 max-w-[650px] font-display text-[clamp(2.7rem,5.1vw,4.8rem)] font-medium leading-[1.01] tracking-[-0.04em] text-cream balance"
            >
              {copy.contact.title}
            </h2>
            <p className="mt-6 max-w-[550px] text-[14.5px] leading-[1.85] text-cream/65 pretty">
              {copy.contact.intro}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/#estimate" variant="light">
                {copy.contact.estimateCta}
              </ButtonLink>
              <ButtonLink
                href={siteConfig.phone.href}
                variant="outline-light"
                withArrow={false}
                aria-label={`Call the sample phone number ${siteConfig.phone.display}. Replace it before launch.`}
              >
                <span className="flex items-center gap-2.5">
                  <Phone className="size-4" />
                  {siteConfig.phone.display}
                </span>
              </ButtonLink>
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-cream/60">
              {copy.contact.phoneNote}
            </p>

            <div className="mt-10 grid gap-px border border-cream/12 bg-cream/12 sm:grid-cols-2">
              {contactItems.map((item) => {
                const Icon = item.icon
                const content = (
                  <>
                    <span className="flex items-center gap-2 text-[8.5px] font-bold uppercase tracking-[0.24em] text-cream/60">
                      <Icon className="size-3.5 text-copper-light" />
                      {item.label}
                    </span>
                    <span className="mt-3 block text-[12.5px] font-semibold leading-snug text-cream">
                      {item.value}
                    </span>
                    <span className="mt-1.5 block text-[9px] uppercase tracking-[0.1em] text-cream/60">
                      {item.note}
                    </span>
                  </>
                )

                return item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className="group bg-ink p-5 transition-colors hover:bg-ink-soft"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={item.label} className="bg-ink p-5">
                    {content}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="self-start border border-cream/15 bg-cream/[0.035]">
            <div className="border-b border-cream/15 p-6 sm:p-7">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper-light">
                {copy.contact.nextEyebrow}
              </p>
              <p className="mt-3 font-display text-[26px] font-medium leading-tight tracking-[-0.02em] text-cream">
                {copy.contact.nextTitle}
              </p>
            </div>
            <ol>
              {copy.contact.nextSteps.map((step) => (
                <li
                  key={step.number}
                  className="flex gap-4 border-b border-cream/12 p-6 sm:px-7"
                >
                  <span className="font-display text-[15px] leading-none text-copper-light">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-[12.5px] font-bold leading-snug text-cream">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-[1.7] text-cream/60">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="p-6 sm:p-7">
              <a
                href="#estimate"
                className="group flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-cream transition-colors hover:text-copper-light"
              >
                {copy.contact.startRequest}
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
              <p className="mt-4 text-[10px] leading-relaxed text-cream/60">
                {copy.contact.previewNote}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-ink-deep text-cream">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.12fr_0.58fr_0.62fr_0.88fr] lg:gap-10">
          <div>
            <Logo tone="light" />
            <p className="mt-6 max-w-[290px] text-[12px] leading-[1.8] text-cream/60">
              {copy.footer.blurb}
            </p>
            <a
              href="/#estimate"
              className="group mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cream transition-colors hover:text-copper-light"
            >
              {copy.footer.requestCta}
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
          </div>

          <nav aria-label="Footer — explore">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-cream/60">
              {copy.footer.exploreLabel}
            </p>
            <ul className="mt-4 space-y-2.5">
              {footerExploreLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[12px] text-cream/65 transition-colors hover:text-cream"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer — services">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-cream/60">
              {copy.footer.servicesLabel}
            </p>
            <ul className="mt-4 space-y-2.5">
              {footerServiceLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[12px] text-cream/65 transition-colors hover:text-cream"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-cream/60">
              {copy.footer.contactLabel}
            </p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={siteConfig.phone.href}
                  aria-label={`Call the sample phone number ${siteConfig.phone.display}. Replace it before launch.`}
                  className="flex items-start gap-2.5 text-[12px] text-cream/65 transition-colors hover:text-cream"
                >
                  <Phone className="mt-0.5 size-3.5 shrink-0 text-copper-light" />
                  {siteConfig.phone.display}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.email.href}
                  className="flex items-start gap-2.5 text-[12px] text-cream/65 transition-colors hover:text-cream"
                >
                  <Mail className="mt-0.5 size-3.5 shrink-0 text-copper-light" />
                  {siteConfig.email.display}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-[12px] leading-relaxed text-cream/60">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-copper-light" />
                {siteConfig.office.display}
              </li>
              <li className="flex items-start gap-2.5 text-[12px] leading-relaxed text-cream/60">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-copper-light" />
                {siteConfig.hours.display}
              </li>
            </ul>
            <a
              href="/#contact"
              className="group mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-copper-light transition-colors hover:text-cream"
            >
              {copy.footer.contactLabel}
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-5 border-t border-cream/10 pt-6 lg:grid-cols-[auto_1fr_auto] lg:items-start lg:gap-10">
          <p className="text-[10px] text-cream/60">
            © {new Date().getFullYear()} {copy.footer.copyrightSuffix}
          </p>
          <p className="max-w-[760px] text-[10px] leading-[1.75] text-cream/60">
            {copy.footer.demoNote}
          </p>
          <a
            href="/#home"
            className="group inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/60 transition-colors hover:text-cream lg:justify-self-end"
          >
            {copy.footer.backToTop}
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </Container>
    </footer>
  )
}
