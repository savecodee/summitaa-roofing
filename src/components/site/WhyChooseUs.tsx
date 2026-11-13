import { copy, media } from '@/config'
import { ArrowRight } from './icons'
import { Container, Eyebrow, Photo } from './primitives'

export function WhyChooseUs() {
  return (
    <section
      id="why-summitaa"
      aria-labelledby="why-heading"
      className="relative overflow-hidden bg-ink text-cream"
    >
      <div
        className="roof-shingle-lines pointer-events-none absolute inset-y-0 right-0 w-[55%] opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-48 top-24 size-[520px] rounded-full bg-copper/[0.07] blur-3xl"
        aria-hidden="true"
      />

      <Container className="relative grid gap-14 py-20 sm:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20 lg:py-28">
        <div className="relative order-2 lg:order-1">
          <div
            className="absolute -left-3 -top-3 hidden h-28 w-28 border-l border-t border-copper/60 sm:block"
            aria-hidden="true"
          />
          <Photo
            src={media.craft.src}
            srcSet={media.craft.srcSet}
            sizes={media.craft.sizes}
            alt={media.craft.alt}
            className="aspect-[4/5] w-full max-w-[500px]"
            imageClassName="object-[50%_45%]"
          />
          <figcaption className="mt-5 flex max-w-[500px] gap-4 border-l border-copper/60 pl-4">
            <p className="text-[11.5px] leading-[1.7] text-cream/55">{copy.why.caption}</p>
          </figcaption>
        </div>

        <div className="order-1 lg:order-2">
          <Eyebrow tone="light">{copy.why.eyebrow}</Eyebrow>
          <h2
            id="why-heading"
            className="mt-5 max-w-[640px] font-display text-[clamp(2.5rem,4.5vw,4.2rem)] font-medium leading-[1.02] tracking-[-0.035em] text-cream balance"
          >
            {copy.why.title}
          </h2>
          <p className="mt-6 max-w-[540px] text-[14.5px] leading-[1.85] text-cream/65 pretty">
            {copy.why.intro}
          </p>

          <ol className="mt-10 grid gap-x-9 gap-y-8 sm:grid-cols-2">
            {copy.why.principles.map((principle) => (
              <li key={principle.number} className="border-t border-cream/15 pt-4">
                <span className="text-[9px] font-bold tracking-[0.22em] text-copper-light">
                  {principle.number}
                </span>
                <h3 className="mt-2 text-[14px] font-bold leading-snug tracking-[0.005em] text-cream">
                  {principle.title}
                </h3>
                <p className="mt-2 text-[12px] leading-[1.75] text-cream/55">{principle.detail}</p>
              </li>
            ))}
          </ol>

          <a
            href="#process"
            className="group mt-10 inline-flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cream transition-colors hover:text-copper-light"
          >
            {copy.why.cta}
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>
      </Container>
    </section>
  )
}
