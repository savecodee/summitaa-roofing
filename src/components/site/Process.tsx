import { copy } from '@/config'
import { ClipboardCheck } from './icons'
import { ButtonLink, Container, Eyebrow } from './primitives'

export function Process() {
  return (
    <section id="process" aria-labelledby="process-heading" className="border-b border-line bg-paper">
      <Container className="grid gap-14 py-20 sm:py-24 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:py-28">
        <div className="self-start lg:sticky lg:top-28">
          <Eyebrow>{copy.process.eyebrow}</Eyebrow>
          <h2
            id="process-heading"
            className="mt-5 font-display text-[clamp(2.5rem,4.5vw,4.2rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance"
          >
            {copy.process.title}
          </h2>
          <p className="mt-6 max-w-md text-[14.5px] leading-[1.85] text-slate pretty">
            {copy.process.intro}
          </p>

          <ButtonLink href="#estimate" className="mt-8">
            {copy.process.cta}
          </ButtonLink>

          <div className="mt-8 flex max-w-md gap-4 border border-line bg-cream p-5">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-copper" />
            <p className="text-[11.5px] leading-[1.75] text-slate">{copy.process.note}</p>
          </div>
        </div>

        <ol className="lg:pt-2">
          {copy.process.steps.map((step, index) => (
            <li key={step.number} className="relative pb-10 pl-14 last:pb-0 sm:pl-16">
              <span
                className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-copper/35 bg-paper font-display text-[15px] font-medium text-copper"
                aria-hidden="true"
              >
                {step.number}
              </span>
              {index < copy.process.steps.length - 1 ? (
                <span className="absolute left-5 top-10 -bottom-1 w-px bg-line" aria-hidden="true" />
              ) : null}
              <div className="border-b border-line pb-10">
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper">
                  {step.label}
                </p>
                <h3 className="mt-3 font-display text-[clamp(2rem,3.4vw,2.7rem)] font-medium leading-[1.08] tracking-[-0.025em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-[570px] text-[13.5px] leading-[1.8] text-slate pretty">
                  {step.description}
                </p>
                <p className="mt-5 flex items-start gap-3 border-l border-copper/40 pl-4 text-[11.5px] font-medium leading-relaxed text-ink/70">
                  <span className="mt-[7px] size-1 shrink-0 bg-copper" aria-hidden="true" />
                  {step.outcome}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
