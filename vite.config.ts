import { whop } from '@whop/cli/vite'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
  define: {
    'import.meta.env.VITE_WHOP_ENV': JSON.stringify(process.env.WHOP_ENV ?? process.env.VITE_WHOP_ENV ?? 'production'),
    'import.meta.env.VITE_WHOP_APP_ID': JSON.stringify(process.env.VITE_WHOP_APP_ID ?? process.env.WHOP_APP_ID ?? 'app_wZYnrCcqbNft8J'),
    'import.meta.env.VITE_WHOP_ACCOUNT_ID': JSON.stringify(process.env.VITE_WHOP_ACCOUNT_ID ?? process.env.WHOP_ACCOUNT_ID ?? ''),
    'import.meta.env.VITE_WHOP_PRODUCT_ID': JSON.stringify(process.env.VITE_WHOP_PRODUCT_ID ?? process.env.WHOP_PRODUCT_ID ?? ''),
    'import.meta.env.VITE_WHOP_BASE_URL': JSON.stringify(process.env.VITE_WHOP_BASE_URL ?? process.env.WHOP_BASE_URL ?? ''),
    'import.meta.env.VITE_WHOP_PLAN_INSPECTION': JSON.stringify(process.env.VITE_WHOP_PLAN_INSPECTION ?? process.env.WHOP_PLAN_INSPECTION ?? ''),
    'import.meta.env.VITE_WHOP_PLAN_DEPOSIT': JSON.stringify(process.env.VITE_WHOP_PLAN_DEPOSIT ?? process.env.WHOP_PLAN_DEPOSIT ?? ''),
    'import.meta.env.VITE_WHOP_PLAN_REPAIR': JSON.stringify(process.env.VITE_WHOP_PLAN_REPAIR ?? process.env.WHOP_PLAN_REPAIR ?? ''),
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    whop({ disableTanstackDevtools: true }),
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
