import { useState } from 'react'
import { copy } from '@/config'
import { Plus } from './icons'
import { ButtonLink, Container, Eyebrow } from './primitives'

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" aria-labelledby="faq-heading" className="border-b border-line bg-paper">
      <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:py-28">
        <div className="self-start lg:sticky lg:top-28">
          <Eyebrow>{copy.faq.eyebrow}</Eyebrow>
          <h2
            id="faq-heading"
            className="mt-5 max-w-[420px] font-display text-[clamp(2.5rem,4.5vw,4.2rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance"
          >
            {copy.faq.title}
          </h2>
          <p className="mt-6 max-w-sm text-[14px] leading-[1.85] text-slate pretty">
            {copy.faq.intro}
          </p>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-[11px] leading-relaxed text-slate">{copy.faq.stillDeciding}</p>
            <ButtonLink href="#contact" variant="secondary" className="mt-4">
              {copy.faq.cta}
            </ButtonLink>
          </div>
        </div>

        <div className="border-y border-line">
          {copy.faq.items.map((faq, index) => {
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
