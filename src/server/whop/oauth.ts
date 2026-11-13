import '@tanstack/react-start/server-only'

import { whopPublicConfig } from '@/config'

/**
 * Server-only helpers for "Sign in with Whop" (OAuth 2.1 + PKCE).
 *
 * The visitor proves who they are with Whop, and the resulting user id is kept
 * in a signed, HttpOnly cookie. That id is the only identity ever sent to the
 * Leads API. No shared or fabricated user id is used.
 */

export const SESSION_COOKIE = 'summitaa_whop_session'
export const OAUTH_COOKIE = 'summitaa_whop_oauth'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const OAUTH_TTL_SECONDS = 60 * 10
const WHOP_OAUTH_BASE = 'https://api.whop.com/oauth'

export type WhopIdentity = {
  userId: string
  name: string | null
  email: string | null
}

type OAuthTransaction = {
  state: string
  nonce: string
  verifier: string
  returnTo: string
  exp: number
}

function readEnv(name: string): string | null {
  if (typeof process === 'undefined' || !process.env) return null
  const value = process.env[name]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function sessionSecret(): string | null {
  return readEnv('WHOP_SESSION_SECRET') ?? readEnv('WHOP_API_KEY')
}

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)))
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return base64url(new Uint8Array(digest))
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return base64url(new Uint8Array(signature))
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

async function seal(value: unknown, secret: string): Promise<string> {
  const payload = base64url(new TextEncoder().encode(JSON.stringify(value)))
  return `${payload}.${await sign(payload, secret)}`
}

async function unseal<T>(value: string | null, secret: string): Promise<T | null> {
  if (!value) return null
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  if (!safeEqual(await sign(payload, secret), signature)) return null

  const bytes = fromBase64url(payload)
  if (!bytes) return null

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    return null
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies

  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (name) cookies[name] = value
  }

  return cookies
}

function serializeCookie(
  name: string,
  value: string,
  options: { maxAge: number; secure: boolean },
): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${options.maxAge}`,
  ]
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

function requestIsSecure(request: Request): boolean {
  const url = new URL(request.url)
  if (url.protocol === 'https:') return true
  return (request.headers.get('x-forwarded-proto') ?? '').split(',')[0]?.trim() === 'https'
}

/** Public origin, tolerating Whop's proxy headers. */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url)
  const forwardedHost = (request.headers.get('x-forwarded-host') ?? '')
    .split(',')[0]
    ?.trim()
  const forwardedProto = (request.headers.get('x-forwarded-proto') ?? '')
    .split(',')[0]
    ?.trim()

  if (forwardedHost && /^[a-z0-9.-]+(:\d+)?$/i.test(forwardedHost)) {
    return `${forwardedProto === 'http' ? 'http' : 'https'}://${forwardedHost}`
  }

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return url.origin
  }

  return whopPublicConfig.baseUrl
}

export function oauthRedirectUri(request: Request): string {
  return `${requestOrigin(request)}/api/auth/whop/callback`
}

export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/#estimate'
  if (value.length > 200) return '/#estimate'
  return value
}

export async function createOAuthTransaction(
  request: Request,
  returnTo: string,
): Promise<{ cookie: string; location: string }> {
  const state = randomToken(16)
  const nonce = randomToken(16)
  const verifier = randomToken(32)
  const challenge = await sha256(verifier)
  const redirectUri = oauthRedirectUri(request)
  const secure = requestIsSecure(request)

  const transaction: OAuthTransaction = {
    state,
    nonce,
    verifier,
    returnTo: safeReturnTo(returnTo),
    exp: Date.now() + OAUTH_TTL_SECONDS * 1000,
  }

  const secret = sessionSecret()
  if (!secret) throw new Error('session_secret_missing')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: whopPublicConfig.appId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  return {
    cookie: serializeCookie(OAUTH_COOKIE, await seal(transaction, secret), {
      maxAge: OAUTH_TTL_SECONDS,
      secure,
    }),
    location: `${WHOP_OAUTH_BASE}/authorize?${params.toString()}`,
  }
}

export async function readOAuthTransaction(
  request: Request,
): Promise<OAuthTransaction | null> {
  const secret = sessionSecret()
  if (!secret) return null

  const value = parseCookies(request.headers.get('cookie'))[OAUTH_COOKIE]
  const transaction = await unseal<OAuthTransaction>(value, secret)
  if (!transaction || typeof transaction.exp !== 'number') return null
  if (transaction.exp < Date.now()) return null
  if (typeof transaction.state !== 'string' || typeof transaction.verifier !== 'string') {
    return null
  }
  if (typeof transaction.nonce !== 'string' || transaction.nonce.length < 8) {
    return null
  }

  return transaction
}

export function clearOAuthCookie(request: Request): string {
  return serializeCookie(OAUTH_COOKIE, '', { maxAge: 0, secure: requestIsSecure(request) })
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const bytes = fromBase64url(parts[1] ?? '')
  if (!bytes) return null
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function identityFromClaims(
  claims: Record<string, unknown>,
  expectedNonce: string,
): WhopIdentity | null {
  const userId = claims.sub
  if (typeof userId !== 'string' || !/^user_[A-Za-z0-9]{6,80}$/.test(userId)) return null

  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now() - 30_000) return null

  const audience = claims.aud
  const audienceMatches =
    audience === whopPublicConfig.appId ||
    (Array.isArray(audience) && audience.includes(whopPublicConfig.appId))
  if (!audienceMatches) return null

  if (claims.nonce !== expectedNonce) return null

  return {
    userId,
    name: typeof claims.name === 'string' ? claims.name.slice(0, 120) : null,
    email: typeof claims.email === 'string' ? claims.email.slice(0, 254) : null,
  }
}

export async function exchangeCodeForIdentity(
  request: Request,
  code: string,
  verifier: string,
  nonce: string,
): Promise<WhopIdentity | null> {
  const redirectUri = oauthRedirectUri(request)
  const tokenResponse = await fetch(`${WHOP_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: whopPublicConfig.appId,
      code_verifier: verifier,
    }),
  })

  if (!tokenResponse.ok) {
    const failure: unknown = await tokenResponse.json().catch(() => null)
    const record =
      typeof failure === 'object' && failure !== null
        ? (failure as Record<string, unknown>)
        : null
    console.error('[oauth] token exchange failed', {
      status: tokenResponse.status,
      error: typeof record?.error === 'string' ? record.error : null,
      description:
        typeof record?.error_description === 'string'
          ? record.error_description.slice(0, 200)
          : null,
      redirectUri,
    })
    return null
  }

  const tokens: unknown = await tokenResponse.json().catch(() => null)
  if (typeof tokens !== 'object' || tokens === null) return null
  const tokenRecord = tokens as Record<string, unknown>
  const accessToken = tokenRecord.access_token
  if (typeof accessToken !== 'string' || accessToken.length < 10) return null

  const userResponse = await fetch(`${WHOP_OAUTH_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}`, accept: 'application/json' },
  })

  if (userResponse.ok) {
    const user: unknown = await userResponse.json().catch(() => null)
    if (typeof user === 'object' && user !== null) {
      const record = user as Record<string, unknown>
      const userId = record.sub
      if (typeof userId === 'string' && /^user_[A-Za-z0-9]{6,80}$/.test(userId)) {
        return {
          userId,
          name: typeof record.name === 'string' ? record.name.slice(0, 120) : null,
          email: typeof record.email === 'string' ? record.email.slice(0, 254) : null,
        }
      }
    }
  } else {
    console.error('[oauth] userinfo unavailable; falling back to the ID token claims', {
      status: userResponse.status,
    })
  }

  // Whop returns an OIDC ID token alongside the access token. It is delivered
  // directly from Whop's token endpoint, so its audience, nonce, and expiry are
  // validated here before the real user id is accepted.
  const idToken = tokenRecord.id_token
  if (typeof idToken === 'string') {
    const claims = decodeJwtPayload(idToken)
    if (claims) {
      const identity = identityFromClaims(claims, nonce)
      if (identity) return identity
    }
  }

  return null
}

export async function createSessionCookie(
  request: Request,
  identity: WhopIdentity,
): Promise<string> {
  const secret = sessionSecret()
  if (!secret) throw new Error('session_secret_missing')

  const payload = {
    ...identity,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  }

  return serializeCookie(SESSION_COOKIE, await seal(payload, secret), {
    maxAge: SESSION_TTL_SECONDS,
    secure: requestIsSecure(request),
  })
}

export function clearSessionCookie(request: Request): string {
  return serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: requestIsSecure(request) })
}

export async function readWhopIdentity(request: Request): Promise<WhopIdentity | null> {
  const secret = sessionSecret()
  if (!secret) return null

  const value = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE]
  const payload = await unseal<WhopIdentity & { exp?: number }>(value, secret)
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
  if (typeof payload.userId !== 'string' || !/^user_[A-Za-z0-9]{6,80}$/.test(payload.userId)) {
    return null
  }

  return {
    userId: payload.userId,
    name: typeof payload.name === 'string' ? payload.name : null,
    email: typeof payload.email === 'string' ? payload.email : null,
  }
}
