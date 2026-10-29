import { media } from '../../config/site'
import { ArrowRight } from './icons'
import { Container, Eyebrow, Photo } from './primitives'

const principles = [
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
] as const

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
            <p className="text-[11.5px] leading-[1.7] text-cream/55">
              Decking, underlayment, flashing, ventilation, edges — a finished roof is a system,
              not just a surface.
            </p>
          </figcaption>
        </div>

        <div className="order-1 lg:order-2">
          <Eyebrow tone="light">Why Summitaa</Eyebrow>
          <h2
            id="why-heading"
            className="mt-5 max-w-[640px] font-display text-[clamp(2.5rem,4.5vw,4.2rem)] font-medium leading-[1.02] tracking-[-0.035em] text-cream balance"
          >
            The details you don&apos;t see are the ones that matter.
          </h2>
          <p className="mt-6 max-w-[540px] text-[14.5px] leading-[1.85] text-cream/65 pretty">
            A roof is more than shingles. Our process is built around the parts that make it last:
            careful observation, a clear explanation, written expectations, and respect for the
            home underneath.
          </p>

          <ol className="mt-10 grid gap-x-9 gap-y-8 sm:grid-cols-2">
            {principles.map((principle) => (
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
            See how we work
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>
      </Container>
    </section>
  )
}
