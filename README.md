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

Seerr is reached through the app's own origin at `/seerr`; point the dev proxy at an instance with
`SEERR_URL=https://seerr.example.com npm run dev` (or a `.env.local`).

### Throwaway Jellyfin + Seerr

`dev/seed.sh` brings up both in Docker (needs `docker compose`, `ffmpeg`, `jq`), generates a small
library of test-pattern clips filed under real titles so metadata and artwork resolve, and completes
both setup wizards. Re-running it is a no-op for everything already done; data lives in `dev/data`.

```sh
./dev/seed.sh
SEERR_URL=http://localhost:5055 npm run dev
```

Sign in with server `http://localhost:8096`, user `devin`, password `devin`. Haikyu!! and Mob Psycho
100 are deliberately incomplete so the request flows have something to do.

## Regenerate the API client

`api/openapi.json` is a pinned copy of the server's `/api-docs/openapi.json` with the `servers` entry removed.

```sh
curl -s "$JELLYFIN_URL/api-docs/openapi.json" | jq 'del(.servers)' > api/openapi.json
npm run generate
```

## Scripts

| Command             | Purpose                      |
| ------------------- | ---------------------------- |
| `npm run dev`       | Vite dev server              |
| `npm run build`     | Typecheck + production build |
| `npm run typecheck` | `tsc -b`                     |
| `npm run lint`      | oxlint                       |
| `npm run fmt`       | oxfmt (write)                |
| `npm run fmt:check` | oxfmt (check)                |
| `npm run test`      | Vitest                       |
| `npm run generate`  | Regenerate `src/api/gen`     |

## Docker

```sh
docker build -t jellyfin-client .
docker run -p 8080:80 jellyfin-client
```

Serves the static build with nginx; the Jellyfin server URL is entered at sign-in.
