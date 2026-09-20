# jellyfin-client

A fast, minimal web client for [Jellyfin](https://jellyfin.org).

## Stack

- React 19 + TypeScript, Vite SPA
- TanStack Router (file-based routes) + TanStack Query (IndexedDB-persisted cache)
- StyleX + React Aria Components
- Typed API client generated from the Jellyfin OpenAPI spec with `@hey-api/openapi-ts`
- oxlint + oxfmt, Vitest

## Develop

```sh
npm install
npm run dev
```

The server URL is entered at runtime on the login page; nothing is baked into the build.

## Regenerate the API client

`api/openapi.json` is a pinned copy of the server's `/api-docs/openapi.json` with the `servers` entry removed.

```sh
curl -s "$JELLYFIN_URL/api-docs/openapi.json" | jq 'del(.servers)' > api/openapi.json
npm run generate
```

## Scripts

| Command             | Purpose                        |
| ------------------- | ------------------------------ |
| `npm run dev`       | Vite dev server                |
| `npm run build`     | Typecheck + production build   |
| `npm run typecheck` | `tsc -b`                       |
| `npm run lint`      | oxlint                         |
| `npm run fmt`       | oxfmt (write)                  |
| `npm run fmt:check` | oxfmt (check)                  |
| `npm run test`      | Vitest                         |
| `npm run generate`  | Regenerate `src/api/gen`       |
