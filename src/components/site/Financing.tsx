import type { ServiceValue } from '../../config/site'
import { ArrowRight, Info } from './icons'
import { Container, Eyebrow } from './primitives'

const questions = [
  {
    number: '01',
    title: 'Start the conversation early.',
    detail: 'Mention financing when you request an estimate so it can be discussed with the scope.',
  },
  {
    number: '02',
    title: 'Third-party terms apply.',
    detail:
      'Any lender application, approval, rate, and repayment schedule is set by the lender — not by Summitaa.',
  },
  {
    number: '03',
    title: 'Put the details in writing.',
    detail:
      'Payment structure and project terms should be documented in the signed agreement before work begins.',
  },
] as const

export function Financing({
  onRequestService,
}: {
  onRequestService: (service: ServiceValue) => void
}) {
  return (
    <section id="financing" aria-labelledby="financing-heading" className="border-b border-line bg-cream">
      <Container className="py-20 sm:py-24 lg:py-28">
        <div className="relative overflow-hidden bg-ink text-cream">
          <div
            className="roof-shingle-lines pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-24 -top-32 size-96 rounded-full bg-copper/[0.08] blur-3xl"
            aria-hidden="true"
          />

          <div className="relative grid lg:grid-cols-[1.12fr_0.88fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <Eyebrow tone="light">Financing</Eyebrow>
              <h2
                id="financing-heading"
                className="mt-5 max-w-[580px] font-display text-[clamp(2.4rem,4.2vw,3.8rem)] font-medium leading-[1.03] tracking-[-0.035em] text-cream balance"
              >
                A larger project, planned without pressure.
              </h2>
              <p className="mt-6 max-w-[540px] text-[14px] leading-[1.85] text-cream/65 pretty">
                If financing is part of your plan, raise it during the estimate. We can talk through
                whether third-party financing options may apply to your project. Any application,
                approval, rate, and repayment terms are set by the lender.
              </p>

              <div className="mt-8 flex max-w-[540px] gap-3.5 border border-cream/15 bg-cream/[0.04] p-4">
                <Info className="mt-0.5 size-4 shrink-0 text-copper-light" />
                <p className="text-[11.5px] leading-[1.75] text-cream/60">
                  <strong className="font-semibold text-cream">Important:</strong> financing is not
                  offered or approved through this website. Nothing here is a credit application,
                  approval, or guarantee of terms. Availability and eligibility are determined by
                  the lender.
                </p>
              </div>
            </div>

            <div className="border-t border-cream/15 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-copper-light">
                Worth asking about
              </p>
              <ol className="mt-6 space-y-5">
                {questions.map((question) => (
                  <li key={question.number} className="flex gap-4">
                    <span className="mt-0.5 font-display text-[15px] text-copper-light">
                      {question.number}
                    </span>
                    <div>
                      <h3 className="text-[13px] font-bold text-cream">{question.title}</h3>
                      <p className="mt-1.5 text-[11.5px] leading-[1.7] text-cream/55">
                        {question.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <a
                href="#estimate"
                onClick={() => onRequestService('financing-question')}
                className="group mt-8 inline-flex items-center gap-2.5 border-t border-cream/15 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-cream transition-colors hover:text-copper-light"
              >
                Ask about financing
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
