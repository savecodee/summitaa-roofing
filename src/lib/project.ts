/**
 * Project references are created by the roofing team and included in the
 * written proposal / deposit link. They are not customer identifiers and must
 * never contain names, emails, phone numbers, or payment data.
 */
export const PROJECT_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/

export function normalizeProjectRef(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return PROJECT_REF_PATTERN.test(trimmed) ? trimmed : null
}
