import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import stylex from '@stylexjs/unplugin'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}
const rootDir = fileURLToPath(new URL('.', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

// Seerr sends no CORS headers, so the client reaches it through a same-origin `/seerr`
// proxy: this one in development, nginx (see nginx.conf) in the container.
const seerrProxy = (url: string | undefined) =>
  url
    ? { '/seerr': { target: url, changeOrigin: true, rewrite: (p: string) => p.slice(6) } }
    : undefined

export default defineConfig(({ mode }) => ({
  server: {
    proxy: seerrProxy(loadEnv(mode, rootDir, '').SEERR_URL),
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: { '@': srcDir },
  },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    stylex.vite({
      useCSSLayers: true,
      aliases: { '@/*': [`${srcDir}/*`] },
      unstable_moduleResolution: { type: 'commonJS', rootDir },
    }),
    react(),
  ],
  build: {
    target: 'es2022',
  },
}))
