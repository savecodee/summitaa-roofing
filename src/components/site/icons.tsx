import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const iconDefaults = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  focusable: 'false',
  'aria-hidden': true,
} as const

export function LogoMark({ className = 'size-6', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...iconDefaults} {...props}>
      <path d="M4.5 17 16 6.5 27.5 17" />
      <path d="M7.5 15.2V25.5h17V15.2" />
      <path d="M13 25.5v-6h6v6" />
      <path d="M20.5 9.8V6.4h2.8v5.8" />
    </svg>
  )
}

export function ArrowRight({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

export function ArrowUpRight({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

export function Phone({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M8.2 4.5 10 8.9l-2.1 2a15.3 15.3 0 0 0 5.2 5.2l2-2.1 4.4 1.8v3a2 2 0 0 1-2.2 2 18.5 18.5 0 0 1-15.2-15.2 2 2 0 0 1 2-2.1h3Z" />
    </svg>
  )
}

export function Mail({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="m3.8 6.8 7.3 5.4a1.5 1.5 0 0 0 1.8 0l7.3-5.4" />
    </svg>
  )
}

export function MapPin({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M20 10.4c0 5.1-8 10.1-8 10.1s-8-5-8-10.1a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </svg>
  )
}

export function Clock({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function Check({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />
    </svg>
  )
}

export function Menu({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M3.5 7h17" />
      <path d="M3.5 12h17" />
      <path d="M3.5 17h11" />
    </svg>
  )
}

export function Close({ className = 'size-5', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

export function Plus({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </svg>
  )
}

export function Info({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  )
}

export function RepairIcon({ className = 'size-7', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...iconDefaults} {...props}>
      <path d="M4 15 16 5l12 10" />
      <path d="M7.5 13.4V27h17V13.4" />
      <path d="M12 19.5h8" />
      <path d="M16 15.5v8" />
    </svg>
  )
}

export function ReplacementIcon({ className = 'size-7', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...iconDefaults} {...props}>
      <path d="m4 14 12-9 12 9" />
      <path d="m4 21 12-9 12 9" />
      <path d="M7.5 27h17" />
    </svg>
  )
}

export function InspectionIcon({ className = 'size-7', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...iconDefaults} {...props}>
      <circle cx="14" cy="14" r="9.5" />
      <path d="m21 21 6.5 6.5" />
      <path d="m9.5 15 4.5-4.5 4.5 4.5" />
      <path d="M11.5 17.2V20h5v-2.8" />
    </svg>
  )
}

export function ClipboardCheck({ className = 'size-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...iconDefaults} {...props}>
      <path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H16" />
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="m8.5 12.5 2 2 4.5-4.5" />
      <path d="M8.5 18h7" />
    </svg>
  )
}

export function RoofPattern({ className = 'size-full', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 400 300" className={className} {...iconDefaults} {...props} aria-hidden="true">
      <path d="M-20 238 200 60l220 178" strokeWidth="1.2" opacity="0.5" />
      <path d="M-20 278 200 100l220 178" strokeWidth="1.2" opacity="0.35" />
      <path d="M-20 318 200 140l220 178" strokeWidth="1.2" opacity="0.2" />
      <path d="M200 60v230" strokeWidth="1" opacity="0.3" />
      <path d="M92 151v159M308 151v159" strokeWidth="1" opacity="0.2" />
    </svg>
  )
}
