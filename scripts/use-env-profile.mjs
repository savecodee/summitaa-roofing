import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const profile = (process.argv[2] ?? '').toLowerCase()
if (profile !== 'live' && profile !== 'sandbox') {
  console.error('Usage: node scripts/use-env-profile.mjs <live|sandbox>')
  process.exit(1)
}

const root = join(process.cwd())
const source = join(root, `.dev.vars.${profile}`)
const target = join(root, '.dev.vars')
const backupDir = join(root, '.dev-vars-backups')

if (!existsSync(source)) {
  console.error(`Missing ${source}. Create it first and keep it gitignored.`)
  process.exit(1)
}

if (existsSync(target)) {
  mkdirSync(backupDir, { recursive: true })
  copyFileSync(target, join(backupDir, `.dev.vars.${new Date().toISOString().replace(/[:.]/g, '-')}`))
}

copyFileSync(source, target)
console.log(`Active Whop environment profile: ${profile}`)
console.log(`Wrote ${target} from ${source}. Original .dev.vars was backed up under .dev-vars-backups.`)
console.log('No API keys were printed. Restart the dev server after this change.')
