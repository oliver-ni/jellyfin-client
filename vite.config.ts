import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import stylex from '@stylexjs/unplugin'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}
const rootDir = fileURLToPath(new URL('.', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
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
})
