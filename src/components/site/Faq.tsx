import { useState } from 'react'
import { Plus } from './icons'
import { ButtonLink, Container, Eyebrow } from './primitives'

const faqs = [
  {
    question: 'What does the $149 roof inspection include?',
    answer:
      'The example inspection covers a visual review of accessible roof surfaces, accessible attic areas where it is safe to do so, photo notes, and a written summary of observed conditions. It does not include repair work, invasive testing, or a promise about how long the roof will last. The $149 figure is a configurable example price; actual pricing depends on the property and a written agreement.',
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
    question: 'What is the $500 project deposit for?',
    answer:
      'It is an example deposit that would reserve project scheduling after you approve a written proposal and would be applied to the project total. Refund, cancellation, and payment terms must be defined in the written agreement. When online deposits are enabled, the payment is collected on the secure Whop deposit page that comes with your project link — not on this marketing page.',
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
] as const

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" aria-labelledby="faq-heading" className="border-b border-line bg-paper">
      <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:py-28">
        <div className="self-start lg:sticky lg:top-28">
          <Eyebrow>FAQ</Eyebrow>
          <h2
            id="faq-heading"
            className="mt-5 max-w-[420px] font-display text-[clamp(2.5rem,4.5vw,4.2rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance"
          >
            Questions worth asking.
          </h2>
          <p className="mt-6 max-w-sm text-[14px] leading-[1.85] text-slate pretty">
            Straight answers about inspections, pricing, deposits, and what happens next. Anything
            unclear is worth asking before you approve a scope.
          </p>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-[11px] leading-relaxed text-slate">
              Still deciding what your roof needs?
            </p>
            <ButtonLink href="#contact" variant="secondary" className="mt-4">
              Talk to us
            </ButtonLink>
          </div>
        </div>

        <div className="border-y border-line">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            const panelId = `faq-panel-${index}`
            const buttonId = `faq-button-${index}`

            return (
              <div key={faq.question} className={index > 0 ? 'border-t border-line' : undefined}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="group flex w-full items-start justify-between gap-5 py-5 text-left sm:py-6"
                  >
                    <span className="flex items-start gap-4">
                      <span className="mt-1 font-display text-[13px] leading-none text-copper">
                        0{index + 1}
                      </span>
                      <span className="font-display text-[19px] font-medium leading-[1.25] tracking-[-0.015em] text-ink transition-colors group-hover:text-copper sm:text-[21px]">
                        {faq.question}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center border transition-colors duration-200 ${
                        isOpen
                          ? 'border-copper bg-copper text-cream'
                          : 'border-ink/15 text-ink group-hover:border-copper/40 group-hover:text-copper'
                      }`}
                      aria-hidden="true"
                    >
                      <Plus
                        className={`size-3.5 transition-transform duration-300 ${
                          isOpen ? 'rotate-45' : ''
                        }`}
                      />
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!isOpen}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p
                      className={`max-w-[650px] pb-6 pl-8 pr-4 text-[12.5px] leading-[1.85] text-slate transition-opacity duration-200 sm:pl-9 ${
                        isOpen ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
