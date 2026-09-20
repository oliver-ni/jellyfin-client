import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './api/openapi.json',
  output: {
    path: './src/api/gen',
    clean: true,
  },
  plugins: [
    { name: '@hey-api/client-fetch', runtimeConfigPath: './src/api/client-config' },
    { name: '@hey-api/typescript', enums: false },
    { name: '@hey-api/sdk', client: true },
    { name: '@tanstack/react-query' },
  ],
})
