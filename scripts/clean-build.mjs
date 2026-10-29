import { rmSync } from 'node:fs'

/**
 * Local preview builds copy `.dev.vars` into `dist/server` for Wrangler. The
 * deploy archive only takes `server/index.js`, but strip the file anyway so a
 * hand-made ZIP of `dist/` can never contain local secrets.
 */
rmSync('dist/server/.dev.vars', { force: true })
