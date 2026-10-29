import { sampleServiceAreas } from '../../config/site'
import { ArrowRight, Info, MapPin } from './icons'
import { Container, Eyebrow, SampleTag } from './primitives'

export function ServiceAreas() {
  return (
    <section
      id="service-areas"
      aria-labelledby="areas-heading"
      className="border-b border-line bg-cream-deep"
    >
      <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20 lg:py-28">
        <div>
          <Eyebrow>Service areas</Eyebrow>
          <h2
            id="areas-heading"
            className="mt-5 max-w-[480px] font-display text-[clamp(2.5rem,4.5vw,4.2rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink balance"
          >
            Local coverage, clearly confirmed.
          </h2>
          <p className="mt-6 max-w-md text-[14.5px] leading-[1.85] text-slate pretty">
            We would rather confirm your address than guess. Send your property ZIP code with your
            request and we can tell you whether it falls within the current service area.
          </p>

          <div className="mt-8 flex max-w-md gap-3.5 border border-ink/10 bg-paper p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-copper" />
            <p className="text-[11.5px] leading-[1.7] text-slate">
              <strong className="font-bold text-ink">Sample content:</strong> the communities below
              are illustrative placeholders, not confirmed service areas. Replace them with your
              actual coverage before launch.
            </p>
          </div>

          <a
            href="#estimate"
            className="group mt-8 inline-flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:text-copper"
          >
            Check your ZIP code
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>

        <div className="relative border border-ink/10 bg-paper p-5 shadow-[0_24px_60px_-48px_rgba(8,23,32,0.5)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate">
              Coverage overview
            </p>
            <SampleTag>Sample areas</SampleTag>
          </div>

          <div className="relative mt-5 overflow-hidden bg-cream/60">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(13, 32, 43, 0.13) 1px, transparent 1px)',
                backgroundSize: '19px 19px',
              }}
              aria-hidden="true"
            />
            <svg
              viewBox="0 0 520 330"
              className="pointer-events-none absolute inset-0 h-full w-full text-ink/[0.08]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <path d="M-30 95C80 65 112 162 220 142S346 76 550 118" />
              <path d="M-20 230C82 190 157 254 256 225S400 176 540 219" />
              <path d="M126 -20c-15 88 30 141 12 211s-23 105-2 159" />
              <path d="M380 -20c8 78-29 127-10 196s30 108 12 174" />
              <circle cx="126" cy="142" r="72" opacity="0.7" />
              <circle cx="126" cy="142" r="4" fill="currentColor" stroke="none" />
              <circle cx="380" cy="225" r="58" opacity="0.55" />
              <circle cx="380" cy="225" r="4" fill="currentColor" stroke="none" />
            </svg>

            <ul className="relative grid grid-cols-2 gap-2.5 p-4 sm:gap-3 sm:p-5">
              {sampleServiceAreas.map((area) => (
                <li
                  key={area}
                  className="flex items-center gap-2.5 border border-ink/10 bg-paper/90 px-3 py-3 text-[12px] font-semibold text-ink backdrop-blur-[2px] sm:px-3.5"
                >
                  <MapPin className="size-3.5 shrink-0 text-copper" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-slate">
              Illustrative locations only — no coverage is implied.
            </p>
            <a
              href="#estimate"
              className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:text-copper"
            >
              Ask about your ZIP
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}
