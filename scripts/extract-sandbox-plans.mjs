import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const envFile = process.env.WHOP_SANDBOX_ENV_FILE ?? '.dev.vars.sandbox'
const path = join(root, envFile)

function parseDevVars(text) {
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 0) continue
    const name = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (name) values[name] = value
  }
  return values
}

const raw = await readFile(path, 'utf8')
const env = parseDevVars(raw)
const apiKey = env.WHOP_API_KEY ?? process.env.WHOP_API_KEY
const base = (env.WHOP_API_BASE_URL ?? process.env.WHOP_API_BASE_URL ?? 'https://sandbox-api.whop.com/api/v1').replace(/\/+$/, '')
const productId = env.VITE_WHOP_PRODUCT_ID ?? process.env.VITE_WHOP_PRODUCT_ID ?? 'prod_FFSXFModF0vkr'
const accountId = env.VITE_WHOP_ACCOUNT_ID ?? process.env.VITE_WHOP_ACCOUNT_ID ?? 'biz_7vkTTLzyYse5ks'

if (!apiKey || apiKey === 'REPLACE_WITH_SANDBOX_API_KEY') {
  console.error('No sandbox API key is stored yet.')
  console.error(`Add a real key to ${envFile} (WHOP_API_KEY=...) and rerun this read-only command.`)
  process.exit(1)
}
if (!/^https:\/\/(api|sandbox-api)\.whop\.com\/api\/v1$/i.test(base)) {
  console.error(`Refusing to use an unsupported API base: ${base}`)
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
}

function collectCandidates(payload) {
  const results = []
  const seen = new Set()
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value
    if (typeof record.id === 'string' && /^plan_|^variant_|^price_/i.test(record.id)) {
      if (!seen.has(record.id)) {
        seen.add(record.id)
        results.push(record)
      }
    }
    for (const key of Object.keys(record)) {
      if (key === 'metadata' || key === 'traits' || key === 'custom_fields') continue
      visit(record[key])
    }
  }
  visit(payload)
  return results
}

const endpoints = [
  `${base}/products/${productId}/plans`,
  `${base}/plans?product_id=${productId}`,
  `${base}/products/${productId}/variants`,
  `${base}/variants?product_id=${productId}`,
  `${base}/products/${productId}`,
]

const found = []
for (const url of endpoints) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    console.error(readableProbeError(response, url))
    continue
  }
  const payload = await response.json()
  const candidates = collectCandidates(payload)
  if (candidates.length > 0) {
    found.push({ url, candidates })
  }
}

if (found.length === 0) {
  console.error('No plan or variant identifiers were returned by the read-only Whop probe.')
  console.error('Inspect the API response structure or plan permissions, then rerun.')
  process.exit(1)
}

console.log('Sandbox plan-like identifiers found. They are returned without exposing the API key:')
for (const probe of found) {
  console.log(`- source: ${probe.url}`)
  for (const plan of probe.candidates) {
    const name = typeof plan.name === 'string' ? ` - ${plan.name}` : ''
    const amount = typeof plan.initial_price === 'string' ? ` ($${plan.initial_price})` : ''
    console.log(`  ${plan.id}${name}${amount}`)
  }
}

console.log('\nNext:')
console.log('1. Choose the three plan IDs for inspection, deposit, and repair.')
console.log('2. Add them only to .dev.vars.sandbox as VITE_WHOP_PLAN_INSPECTION, VITE_WHOP_PLAN_DEPOSIT, and VITE_WHOP_PLAN_REPAIR.')
console.log('3. Run npm run use-env-profile sandbox (if .dev.vars currently points to live).')
console.log('4. Run bun run dev:sandbox.')
console.log('\nAccount/product context:')
console.log(`- account: ${accountId}`)
console.log(`- product: ${productId}`)
console.log('\nNo pricing values or secrets were modified by this script.')

function readableProbeError(response, url) {
  return `Probe failed: ${url} -> HTTP ${response.status}; skipping endpoint.`
}
