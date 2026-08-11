# ComfyPeer

Real-time AI video from your own ComfyUI graph. Runs on Livepeer's GPU network. Billed by the second via PymtHouse.

> **ComfyPeer — real-time AI video from your own ComfyUI graph.**  
> Point a camera or a stream at it, change the prompt while it's running, and watch the output change in the same second.

## Stack

- Next.js 15 (App Router) · React 19 · Tailwind CSS v4
- PymtHouse Builder API (`@pymthouse/builder-sdk`) for metering & billing
- Staging Livepeer orchestrators on `:8936`

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

## Staging orchestrators

| # | URL | IP |
|---|---|---|
| 1 | `https://liverunner-staging-1.daydream.monster:8936` | `136.66.21.17` |
| 2 | `https://liverunner-2.daydream.monster:8936` | `136.109.52.89` |
| 3 | `https://liverunner-3.daydream.monster:8936` | `35.230.73.110` |
