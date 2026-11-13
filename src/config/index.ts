/**
 * Unified configuration entry point.
 *
 * Re-exports all business-specific values from `site.ts` and Whop public
 * identifiers from `whop.ts`. Components and server code should import from
 * `@/config` (aliased to this file) instead of the individual modules.
 */

export * from './site'
export * from './whop'