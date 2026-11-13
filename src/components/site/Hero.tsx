import { copy, media, serviceCommitments } from '@/config'
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
          <Eyebrow>{copy.hero.eyebrow}</Eyebrow>

          <h1 className="mt-7 font-display text-[clamp(3rem,7.4vw,6.25rem)] font-medium leading-[0.94] tracking-[-0.045em] text-ink balance">
            {copy.hero.titleLead}
            <span className="mt-1 block italic text-copper">{copy.hero.titleAccent}</span>
          </h1>

          <p className="mt-7 max-w-[560px] text-[16px] leading-[1.75] text-slate pretty sm:text-[17px]">
            {copy.hero.body}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="#start">{copy.hero.primaryCta}</ButtonLink>
            <ButtonLink href="#services" variant="secondary">
              {copy.hero.secondaryCta}
            </ButtonLink>
          </div>

          <div className="mt-9 flex items-center gap-4 border-t border-ink/10 pt-5">
            <span className="hidden h-9 w-px bg-copper sm:block" aria-hidden="true" />
            <p className="max-w-md text-[12.5px] leading-relaxed text-slate">{copy.hero.note}</p>
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

            <div className="absolute inset-x-4 bottom-4 border border-cream/15 bg-ink/95 p-5 text-cream shadow-hero backdrop-blur-sm sm:inset-x-6 sm:bottom-6 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.26em] text-copper-light">
                  {copy.hero.approachEyebrow}
                </p>
                <span
                  className="hidden text-[8.5px] font-semibold uppercase tracking-[0.24em] text-cream/65 sm:block"
                  aria-hidden="true"
                >
                  {copy.hero.approachRange}
                </span>
              </div>
              <p className="mt-3 font-display text-[23px] font-normal leading-[1.18] tracking-[-0.02em] text-cream sm:text-[26px]">
                {copy.hero.approachTitle}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-cream/15 pt-3.5">
                {copy.hero.approachSteps.map((step) => (
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
    <section aria-label={copy.hero.trustLabel} className="border-b border-line bg-paper">
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
