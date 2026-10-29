import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { whopPublicConfig } from '../src/config/whop.ts'
import { whopPixelBootstrapScript } from '../src/lib/pixel.ts'

const ROOT = join(import.meta.dir, '..')
const SRC = join(ROOT, 'src')

function walk(directory) {
  const files = []

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    if (statSync(fullPath).isDirectory()) files.push(...walk(fullPath))
    else files.push(fullPath)
  }

  return files
}

const sourceFiles = walk(SRC).filter((file) => /\.(ts|tsx|js|jsx|css|json)$/.test(file))

const secretPatterns = [
  { name: 'PEM private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Stripe-style secret', pattern: /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { name: 'Whop API key', pattern: /sk_[A-Za-z0-9]{24,}/ },
  { name: 'Whop webhook secret', pattern: /ws_[A-Za-z0-9]{24,}/ },
]

describe('secret leakage scan', () => {
  test('no hardcoded secrets in src', () => {
    const findings = []

    for (const file of sourceFiles) {
      const contents = readFileSync(file, 'utf8')
      for (const { name, pattern } of secretPatterns) {
        if (pattern.test(contents)) {
          findings.push(`${name}: ${relative(ROOT, file)}`)
        }
      }
    }

    expect(findings).toEqual([])
  })

  test('no environment values are assigned in source', () => {
    const findings = []

    for (const file of sourceFiles) {
      const contents = readFileSync(file, 'utf8')
      if (/WHOP_(?:API_KEY|WEBHOOK_SECRET|OPERATOR_TOKEN)\s*[:=]\s*['"][^'"]{8,}/.test(contents)) {
        findings.push(relative(ROOT, file))
      }
    }

    expect(findings).toEqual([])
  })

  test('.env files are ignored by git', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8')
    expect(gitignore).toMatch(/^\.env$/m)
    expect(gitignore).toMatch(/^\.env\.\*$/m)
    expect(gitignore).toMatch(/^!\.env\.example$/m)
  })

  test('no console.log of request or payment data', () => {
    const findings = []

    for (const file of sourceFiles) {
      const contents = readFileSync(file, 'utf8')
      if (/console\.(?:log|warn|info|debug)\s*\(/.test(contents)) {
        findings.push(relative(ROOT, file))
      }
    }

    expect(findings).toEqual([])
  })

  test('inline script is limited to the static Pixel bootstrap', () => {
    const findings = []

    for (const file of sourceFiles) {
      const contents = readFileSync(file, 'utf8')
      if (contents.includes('dangerouslySetInnerHTML') && !file.endsWith('__root.tsx')) {
        findings.push(relative(ROOT, file))
      }
    }

    expect(findings).toEqual([])
  })
})

describe('public configuration surface', () => {
  test('src/config/whop.ts exposes identifiers only', () => {
    expect(Object.keys(whopPublicConfig).sort()).toEqual([
      'accountId',
      'appId',
      'baseUrl',
      'plans',
      'productId',
    ])

    const contents = readFileSync(join(SRC, 'config', 'whop.ts'), 'utf8')
    expect(contents).not.toMatch(/secret\s*:\s*['"]/)
    expect(contents).not.toMatch(/apiKey\s*:\s*['"]/)
    expect(contents).not.toMatch(/token\s*:\s*['"]/)
  })

  test('the Pixel bootstrap contains the public account ID and no secret', () => {
    const script = whopPixelBootstrapScript()

    expect(script).toContain(whopPublicConfig.accountId)
    expect(script).toContain('https://t.whop.tw')
    expect(script).not.toContain('sk_')
    expect(script).not.toContain('ws_')
    expect(script).not.toContain('authorization')
  })

  test('browser modules never import server-only code', () => {
    const browserFiles = sourceFiles.filter((file) => {
      const path = relative(SRC, file).split(sep).join('/')
      if (path.startsWith('server/')) return false
      if (path.startsWith('routes/api/')) return false
      return /\.(ts|tsx)$/.test(file)
    })

    const findings = []

    for (const file of browserFiles) {
      const contents = readFileSync(file, 'utf8')
      if (
        contents.includes('server-only') ||
        /from\s+['"][^'"]*\/server\//.test(contents) ||
        /from\s+['"]\.\.\/server/.test(contents)
      ) {
        findings.push(relative(ROOT, file))
      }
    }

    expect(findings).toEqual([])
  })

  test('event builders contain no contact or payment fields', () => {
    const contents = readFileSync(join(SRC, 'lib', 'events.ts'), 'utf8')

    expect(contents).not.toMatch(/(?:^|[\s,{])email\s*:/m)
    expect(contents).not.toMatch(/(?:^|[\s,{])phone\s*:/m)
    expect(contents).not.toMatch(/(?:^|[\s,{])customer_name\s*:/m)
    expect(contents).not.toMatch(/(?:^|[\s,{])card_number\s*:/m)
  })
})
