import { useState, type MouseEventHandler, type ReactNode } from 'react'
import { ArrowRight, LogoMark } from './icons'

export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10 ${className}`}>
      {children}
    </div>
  )
}

export function Eyebrow({
  children,
  tone = 'dark',
  className = '',
}: {
  children: ReactNode
  tone?: 'dark' | 'light'
  className?: string
}) {
  return (
    <p
      className={`flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] ${
        tone === 'light' ? 'text-cream/60' : 'text-slate'
      } ${className}`}
    >
      <span className="h-px w-7 shrink-0 bg-copper" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export function Logo({
  tone = 'dark',
  className = '',
}: {
  tone?: 'dark' | 'light'
  className?: string
}) {
  const isDark = tone === 'dark'

  return (
    <a
      href="/"
      className={`group inline-flex items-center gap-3 rounded-sm ${className}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center border transition-colors duration-200 ${
          isDark
            ? 'border-ink bg-ink text-cream group-hover:bg-ink-soft'
            : 'border-cream/50 bg-transparent text-cream group-hover:bg-cream/10'
        }`}
      >
        <LogoMark className="size-[25px]" />
      </span>
      <span className="flex flex-col">
        <span
          className={`font-display text-[21px] font-medium uppercase leading-none tracking-[0.14em] ${
            isDark ? 'text-ink' : 'text-cream'
          }`}
        >
          Summitaa
        </span>
        <span
          className={`mt-[7px] flex items-center gap-2 text-[8px] font-bold uppercase leading-none tracking-[0.4em] ${
            isDark ? 'text-slate' : 'text-cream/60'
          }`}
        >
          Roofing
          <span className="h-px w-4 bg-copper" aria-hidden="true" />
        </span>
      </span>
    </a>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'light' | 'outline-light'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border border-copper bg-copper text-cream shadow-[0_8px_22px_-14px_rgba(13,32,43,0.65)] hover:border-copper-deep hover:bg-copper-deep',
  secondary:
    'border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-cream',
  light:
    'border border-cream bg-cream text-ink hover:border-white hover:bg-white',
  'outline-light':
    'border border-cream/30 bg-transparent text-cream hover:border-cream/70 hover:bg-cream/10',
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className = '',
  withArrow = true,
  onClick,
  'aria-label': ariaLabel,
}: {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  className?: string
  withArrow?: boolean
  onClick?: MouseEventHandler<HTMLAnchorElement>
  'aria-label'?: string
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[2px] px-6 py-3.5 text-sm font-semibold tracking-[0.01em] transition-colors duration-200 ${buttonVariants[variant]} ${className}`}
    >
      <span>{children}</span>
      {withArrow ? (
        <ArrowRight className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      ) : null}
    </a>
  )
}

export function Photo({
  src,
  srcSet,
  sizes,
  alt,
  className = '',
  imageClassName = '',
  eager = false,
}: {
  src: string
  srcSet?: string
  sizes?: string
  alt: string
  className?: string
  imageClassName?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-ink-soft ${className}`}>
      {failed ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full min-h-72 w-full flex-col items-center justify-center gap-4 bg-ink-soft p-8 text-center"
        >
          <svg
            viewBox="0 0 120 74"
            className="w-36 text-copper-light/70"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <path d="M4 60 60 12l56 48" />
            <path d="M18 52v18h84V52" />
            <path d="M46 70V54h28v16" />
            <path d="M37 28v-7h9v14" />
          </svg>
          <span className="text-[9px] font-semibold uppercase tracking-[0.32em] text-cream/60">
            Summitaa Roofing
          </span>
        </div>
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imageClassName}`}
        />
      )}
    </div>
  )
}

export function SampleTag({
  children = 'Sample',
  tone = 'light',
}: {
  children?: ReactNode
  tone?: 'light' | 'dark'
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
        tone === 'light'
          ? 'border-copper/30 bg-copper/[0.07] text-copper-deep'
          : 'border-cream/20 bg-cream/[0.06] text-cream/70'
      }`}
    >
      <span className="size-1 bg-copper" aria-hidden="true" />
      {children}
    </span>
  )
}
