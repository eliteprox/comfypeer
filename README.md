# ComfyPeer

Real-time AI video from your own ComfyUI graph. Runs on Livepeer's GPU network. Billed by the second via PymtHouse.

> **ComfyPeer — real-time AI video from your own ComfyUI graph.**  
> Point a camera or a stream at it, change the prompt while it's running, and watch the output change in the same second.

## Stack

- Next.js 15 (App Router) · React 19 · Tailwind CSS v4
- PymtHouse Builder API (`@pymthouse/builder-sdk`) for metering & billing
- Orchestrators from SignerSession `discovery_url` (`GET /discover-orchestrators`)

## Develop

```bash
pnpm install
cp .env.example .env.local   # fill staging creds
pnpm dev
```

`NEXT_PUBLIC_APP_URL` must be the public origin (scheme + host, no path), e.g.
`http://localhost:3000` or `https://comfypeer.example`. Browser session
provisioning rejects the request when this value is missing or not a valid URL.

## Scripts

| Command          | Purpose                |
| ---------------- | ---------------------- |
| `pnpm dev`       | Local server           |
| `pnpm build`     | Production build       |
| `pnpm typecheck` | `tsc --noEmit`         |
| `pnpm lint`      | ESLint (zero warnings) |

## Design system

See `design-system/MASTER.md` and `design-system/pages/*`.

## Deploy

Set every variable in `.env.example` on the host. In particular:

- `NEXT_PUBLIC_APP_URL` — public origin used for CSRF origin/referer checks.
  Provisioning fails closed if it is unset or invalid. Do not fall back to
  localhost in production.
- `COMFYPEER_SESSION_SECRET` — HMAC key for `__Host-comfypeer_session`. Bump
  `SESSION_VERSION` in `lib/session.ts` to invalidate existing cookies after a
  suspected leak (clearing the cookie alone cannot revoke a copied token).
- Auth0 and PymtHouse credentials as listed in `.env.example`.

The session cookie uses the `__Host-` prefix (Secure, `Path=/`, no Domain).
The app must be served over HTTPS, or over `localhost` for local development.

## Orchestrator discovery

ComfyPeer mints an owner SignerSession and uses the suggested `discovery_url`
(default `{signer_url}/discover-orchestrators`). `ORCH_URL` / `ORCH_URLS` are unused.
