import { useEffect, useRef } from 'react'
import { copy, serviceCatalog, type ServiceValue } from '@/config'
import { trackServiceViewed } from '../../lib/tracking'
import { ArrowRight, InspectionIcon, RepairIcon, ReplacementIcon } from './icons'
import { Container, Eyebrow } from './primitives'

const serviceIcons = {
  repair: RepairIcon,
  replacement: ReplacementIcon,
  inspection: InspectionIcon,
} as const

type Service = (typeof serviceCatalog)[number]

function ServiceCard({
  service,
  onRequestService,
}: {
  service: Service
  onRequestService: (service: ServiceValue) => void
}) {
  const cardRef = useRef<HTMLElement>(null)

  /*
   * Fire `service_viewed` once per service per session when the card is
   * actually on screen. The tracking helper deduplicates by sessionStorage,
   * and the Whop Events API deduplicates by the stable event ID.
   */
  useEffect(() => {
    const node = cardRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    let fired = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (fired) return
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35,
        )
        if (!visible) return

        fired = true
        trackServiceViewed(service.value)
        observer.disconnect()
      },
      { threshold: [0.35] },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [service.value])

  const Icon = serviceIcons[service.icon]

  return (
    <article
      ref={cardRef}
      id={service.id}
      className="group relative flex flex-col border border-line bg-paper p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-service sm:p-7"
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-copper transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate">
          {service.number}
        </span>
        <span className="grid size-12 place-items-center border border-line bg-cream text-copper transition-colors duration-300 group-hover:border-copper/30 group-hover:bg-copper/[0.06]">
          <Icon className="size-7" />
        </span>
      </div>

      <h3 className="mt-10 font-display text-[30px] font-medium leading-none tracking-[-0.025em] text-ink sm:text-[33px]">
        {service.title}
      </h3>
      <p className="mt-4 text-[13.5px] leading-[1.75] text-slate pretty">
        {service.description}
      </p>

      <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
        {service.details.map((detail) => (
          <li
            key={detail}
            className="flex items-center gap-2.5 text-[12px] font-medium text-ink/70"
          >
            <span className="size-1 shrink-0 bg-copper" aria-hidden="true" />
            {detail}
          </li>
        ))}
      </ul>

      <a
        href="#estimate"
        onClick={() => onRequestService(service.value)}
        className="mt-7 inline-flex items-center gap-2 border-t border-line pt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:text-copper"
        aria-label={`${service.cta} — go to the estimate request form`}
      >
        {service.cta}
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </a>
    </article>
  )
}

export function Services({
  onRequestService,
}: {
  onRequestService: (service: ServiceValue) => void
}) {
  return (
    <section id="services" aria-labelledby="services-heading" className="border-b border-line bg-cream">
      <Container className="py-20 sm:py-24 lg:py-32">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end lg:gap-20">
          <div>
            <Eyebrow>{copy.services.eyebrow}</Eyebrow>
            <h2
              id="services-heading"
              className="mt-5 max-w-[680px] font-display text-[clamp(2.5rem,4.4vw,4.1rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance"
            >
              {copy.services.title}
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-[1.8] text-slate pretty lg:justify-self-end">
            {copy.services.intro}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-6">
          {serviceCatalog.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onRequestService={onRequestService}
            />
          ))}
        </div>

        <p className="mt-8 text-center text-[12px] text-slate">
          {copy.services.footerPrompt}{' '}
          <a
            href="#estimate"
            className="font-semibold text-ink underline decoration-copper/40 decoration-1 underline-offset-4 transition-colors hover:text-copper"
          >
            {copy.services.footerLink}
          </a>
        </p>
      </Container>
    </section>
  )
}
