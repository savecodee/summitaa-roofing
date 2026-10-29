import { media, serviceCommitments } from '../../config/site'
import { Check } from './icons'
import { ButtonLink, Container, Eyebrow, Photo } from './primitives'

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden border-b border-line/70 bg-cream">
      <div className="blueprint-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-40 top-10 size-[540px] rounded-full bg-copper/[0.045] blur-3xl"
        aria-hidden="true"
      />

      <Container className="relative grid grid-cols-1 gap-14 pb-16 pt-14 sm:gap-16 sm:pt-20 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
        <div className="max-w-[660px]">
          <Eyebrow>Residential roofing · United States</Eyebrow>

          <h1 className="mt-7 font-display text-[clamp(3rem,7.4vw,6.25rem)] font-medium leading-[0.94] tracking-[-0.045em] text-ink balance">
            A roof you can
            <span className="mt-1 block italic text-copper">stop thinking about.</span>
          </h1>

          <p className="mt-7 max-w-[560px] text-[16px] leading-[1.75] text-slate pretty sm:text-[17px]">
            Repair, replacement, and inspection for American homes — with an inspection-first
            process, a written scope, and a crew that treats your property like it matters.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="#estimate">Request an Estimate</ButtonLink>
            <ButtonLink href="#services" variant="secondary">
              Explore Services
            </ButtonLink>
          </div>

          <div className="mt-9 flex items-center gap-4 border-t border-ink/10 pt-5">
            <span className="hidden h-9 w-px bg-copper sm:block" aria-hidden="true" />
            <p className="max-w-md text-[12.5px] leading-relaxed text-slate">
              Every project begins with a look at the roof — not a sales pitch. We inspect, explain
              the options, and put the next step in writing.
            </p>
          </div>
        </div>

        <div className="relative lg:pl-2">
          <div className="relative mx-auto max-w-[540px] lg:ml-auto">
            <div
              className="absolute -left-3 -top-3 hidden h-32 w-32 border-l border-t border-copper/60 sm:block"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-3 -right-3 hidden h-32 w-32 border-b border-r border-ink/15 sm:block"
              aria-hidden="true"
            />

            <Photo
              src={media.hero.src}
              srcSet={media.hero.srcSet}
              sizes={media.hero.sizes}
              alt={media.hero.alt}
              eager
              className="aspect-[4/5] w-full sm:aspect-[5/6] lg:aspect-[4/5]"
              imageClassName="object-[50%_58%]"
            />

            <div className="absolute inset-x-4 bottom-4 border border-cream/15 bg-ink/95 p-5 text-cream shadow-[0_18px_40px_-22px_rgba(8,23,32,0.9)] backdrop-blur-sm sm:inset-x-6 sm:bottom-6 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.26em] text-copper-light">
                  The Summitaa approach
                </p>
                <span
                  className="hidden text-[8.5px] font-semibold uppercase tracking-[0.24em] text-cream/65 sm:block"
                  aria-hidden="true"
                >
                  01 — 03
                </span>
              </div>
              <p className="mt-3 font-display text-[23px] font-normal leading-[1.18] tracking-[-0.02em] text-cream sm:text-[26px]">
                Inspect first. Explain clearly. Finish with care.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-cream/15 pt-3.5">
                {['Inspect', 'Propose', 'Build'].map((step) => (
                  <span
                    key={step}
                    className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-cream/65"
                  >
                    <span className="size-1 bg-copper-light" aria-hidden="true" />
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function TrustStrip() {
  return (
    <section aria-label="What you can expect from Summitaa Roofing" className="border-b border-line bg-paper">
      <Container className="grid gap-x-9 gap-y-5 py-7 sm:grid-cols-2 lg:grid-cols-4 lg:py-8">
        {serviceCommitments.map((item) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center border border-copper/30 text-copper">
              <Check className="size-3" />
            </span>
            <div>
              <p className="text-[12.5px] font-bold tracking-[0.01em] text-ink">{item.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate">{item.detail}</p>
            </div>
          </div>
        ))}
      </Container>
    </section>
  )
}
