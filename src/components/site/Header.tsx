import { useCallback, useEffect, useRef, useState } from 'react'
import { navLinks, siteConfig } from '../../config/site'
import { ArrowRight, ArrowUpRight, Close, Menu, Phone } from './icons'
import { ButtonLink, Container, Logo } from './primitives'

function PhoneCallLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={siteConfig.phone.href}
      title="Sample phone number — replace before launch"
      className={`group items-center gap-3 text-ink transition-colors hover:text-copper ${
        compact ? 'inline-flex' : 'hidden xl:inline-flex'
      }`}
    >
      <span className="grid size-8 place-items-center border border-ink/15 text-copper transition-colors group-hover:border-copper/40">
        <Phone className="size-3.5" />
      </span>
      <span className="flex flex-col">
        <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-slate">
          Call us
        </span>
        <span className="mt-0.5 text-[13px] font-semibold tracking-[0.02em]">
          {siteConfig.phone.display}
        </span>
      </span>
    </a>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  const closeMenu = useCallback((returnFocus = false) => {
    setOpen(false)
    if (returnFocus) {
      window.requestAnimationFrame(() => toggleRef.current?.focus())
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    const focusTimer = window.setTimeout(() => firstLinkRef.current?.focus(), 80)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(focusTimer)
    }
  }, [open, closeMenu])

  useEffect(() => {
    if (!open) return

    const desktopQuery = window.matchMedia('(min-width: 1024px)')
    const handleChange = () => {
      if (desktopQuery.matches) setOpen(false)
    }

    desktopQuery.addEventListener('change', handleChange)
    return () => desktopQuery.removeEventListener('change', handleChange)
  }, [open])

  return (
    <>
      <div className="bg-ink text-cream">
        <Container className="flex min-h-10 items-center justify-between gap-4 py-2">
          <p className="hidden items-center gap-2.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-cream/60 lg:flex">
            <span className="size-1.5 bg-copper" aria-hidden="true" />
            Residential roofing · Repair · Replacement · Inspection
          </p>
          <div className="flex w-full items-center justify-end gap-5 md:w-auto">
            <a
              href={siteConfig.phone.href}
              className="hidden items-center gap-2 whitespace-nowrap text-[11px] font-semibold tracking-[0.03em] text-cream/75 transition-colors hover:text-cream sm:flex"
              aria-label={`Call the sample phone number ${siteConfig.phone.display}. Replace it before launch.`}
              title="Sample phone number — replace before launch"
            >
              <Phone className="size-3 text-copper-light" />
              {siteConfig.phone.display}
            </a>
            <span className="hidden h-3 w-px bg-cream/20 sm:block" aria-hidden="true" />
            <a
              href="/#estimate"
              className="group inline-flex items-center gap-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.18em] text-cream transition-colors hover:text-copper-light"
            >
              Request an estimate
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
        </Container>
      </div>

      <header className="sticky top-0 z-50 border-b border-line/80 bg-cream/95 backdrop-blur-md">
        <Container className="flex h-[74px] items-center justify-between gap-5">
          <Logo />

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex xl:gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative py-2 text-[12.5px] font-semibold tracking-[0.01em] text-ink/70 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-copper after:transition-transform after:duration-200 hover:text-ink hover:after:scale-x-100"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <PhoneCallLink />
            <a
              href={siteConfig.phone.href}
              aria-label={`Call the sample phone number ${siteConfig.phone.display}. Replace it before launch.`}
              title="Sample phone number — replace before launch"
              className="grid size-10 place-items-center border border-ink/15 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-cream xl:hidden"
            >
              <Phone className="size-4" />
            </a>
            <span className="hidden lg:block">
              <ButtonLink
                href="/#estimate"
                variant="primary"
                withArrow={false}
                className="!min-h-10 !px-5 !py-2.5 !text-[12px]"
              >
                Request an Estimate
              </ButtonLink>
            </span>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="grid size-10 place-items-center border border-ink/15 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-cream lg:hidden"
            >
              {open ? <Close className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </Container>

        {open ? (
          <div
            id="mobile-navigation"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-7.25rem)] overflow-y-auto border-b border-ink/10 bg-cream shadow-[0_24px_60px_-20px_rgba(8,23,32,0.35)] lg:hidden"
          >
            <Container className="py-7">
              <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.28em] text-slate">
                <span className="h-px w-6 bg-copper" aria-hidden="true" />
                Menu
              </p>
              <nav aria-label="Mobile primary" className="mt-3 border-t border-line">
                {navLinks.map((link, index) => (
                  <a
                    key={link.href}
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={link.href}
                    onClick={() => closeMenu()}
                    className="group flex items-center justify-between border-b border-line py-3.5 text-ink transition-colors hover:text-copper"
                  >
                    <span className="font-display text-[25px] font-medium tracking-[-0.01em]">
                      {link.label}
                    </span>
                    <ArrowUpRight className="size-4 text-slate transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-copper" />
                  </a>
                ))}
              </nav>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ButtonLink
                  href="/#estimate"
                  onClick={() => closeMenu()}
                  variant="primary"
                  className="w-full"
                >
                  Request an Estimate
                </ButtonLink>
                <a
                  href={siteConfig.phone.href}
                  onClick={() => closeMenu()}
                  aria-label={`Call the sample phone number ${siteConfig.phone.display}. Replace it before launch.`}
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 border border-ink/20 px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-cream"
                >
                  <Phone className="size-4" />
                  {siteConfig.phone.display}
                </a>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-slate">
                Phone number and service areas are sample placeholders. Actual contact details and
                coverage will be confirmed before launch.
              </p>
            </Container>
          </div>
        ) : null}
      </header>
    </>
  )
}
