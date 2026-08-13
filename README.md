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

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Local server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (zero warnings) |

## Design system

See `design-system/MASTER.md` and `design-system/pages/*`.

## Orchestrator discovery

ComfyPeer mints an owner SignerSession and uses the suggested `discovery_url`
(default `{signer_url}/discover-orchestrators`). `ORCH_URL` / `ORCH_URLS` are unused.
