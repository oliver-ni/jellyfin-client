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

// Reads Sonarr allows through the proxy; the API key stays on this side of it.
const SONARR_READS = /^\/sonarr\/api\/v3\/(system\/status|series\/\d+|episode|queue)(\?|$)/

// Seerr sends no CORS headers and Sonarr wants an API key, so the client reaches both through
// same-origin `/seerr` and `/sonarr` proxies: these in development, nginx (see nginx.conf) in
// the container.
const proxies = (env: Record<string, string>) => ({
  ...(env.SEERR_URL && {
    '/seerr': { target: env.SEERR_URL, changeOrigin: true, rewrite: (p: string) => p.slice(6) },
  }),
  ...(env.SONARR_URL && {
    '/sonarr': {
      target: env.SONARR_URL,
      changeOrigin: true,
      rewrite: (p: string) => p.slice(7),
      headers: { 'X-Api-Key': env.SONARR_API_KEY ?? '' },
      bypass: (req: { method?: string; url?: string }) =>
        req.method === 'GET' && SONARR_READS.test(req.url ?? '') ? undefined : false,
    },
  }),
})

export default defineConfig(({ mode }) => ({
  server: {
    proxy: proxies(loadEnv(mode, rootDir, '')),
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Persisted query data is parsed into the client's own shapes, so a new build drops it.
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
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
