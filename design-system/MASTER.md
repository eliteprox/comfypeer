# Design System Master File — ComfyPeer

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** ComfyPeer  
**Generated:** 2026-08-11  
**Category:** Real-time AI video (ComfyStream) on Livepeer live runners · metered by PymtHouse  
**Mode:** Dark-only (OLED). No light theme for v1.

---

## Product truth (do not drift)

- ComfyPeer is **real-time video** (webcam/stream → Comfy img2img → live output), not batch image generation.
- Billing unit is **seconds of stream time** (`billable_secs`), not GPU-hours.
- "Bring your graph" is **bounded** by nodes/models/engines baked into the live-runner image.
- Resolution UI is a **picklist** (512² / 384×704 / 704×384), not freeform.
- Marketing voice: calm, precise, slightly dry. Numbers over hype. No crypto vocabulary on marketing surfaces.
- Logomark: **two-node graph with connecting edge** — reads as link at 16px, workflow at 512px.

### One-liner (canonical)

> **ComfyPeer — real-time AI video from your own ComfyUI graph.**  
> Point a camera or a stream at it, change the prompt while it's running, and watch the output change in the same second. Runs on Livepeer's GPU network. Billed by the second.

---

## Global Rules

### Color Palette

Near-black canvas · cool structure · one live accent · warm **only** for billing.

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Canvas / bg-0 | `#050507` | `--color-canvas` | Page background (OLED black with slight blue bias) |
| Surface / bg-1 | `#0C0C10` | `--color-surface` | Panels, sidebars |
| Elevated / bg-2 | `#14141A` | `--color-elevated` | Cards, popovers, editor chrome |
| Elevated+ / bg-3 | `#1C1C24` | `--color-elevated-2` | Hover rows, selected chips |
| Border | `#2A2A36` | `--color-border` | Hairlines, node edges at rest |
| Border strong | `#3D3D4F` | `--color-border-strong` | Focused panels, active ports |
| Foreground | `#F2F2F5` | `--color-fg` | Primary text |
| Muted | `#8B8B9A` | `--color-muted` | Secondary labels |
| Faint | `#5C5C6E` | `--color-faint` | Tertiary / disabled |
| **Live / execute** | `#3DFF9A` | `--color-live` | Execution highlight, live pulse, primary CTA fill on dark |
| Live dim | `#1A4D35` | `--color-live-dim` | Live track / progress fill bg |
| Cool structure | `#6B8CFF` | `--color-cool` | Ports, connectors, info links (not CTA) |
| Cool dim | `#2A3355` | `--color-cool-dim` | Edge idle stroke |
| Success | `#3DFF9A` | `--color-success` | Same as live — success = running/ok |
| Warning (billing) | `#F5A524` | `--color-billing-warn` | **`at_risk` only** — never decorative |
| Danger (billing) | `#FF4D4D` | `--color-billing-block` | **`blocked` only** + hard errors |
| Overage | `#6B8CFF` | `--color-overage` | `overage` state (cool, not warm) |
| Ring / focus | `#3DFF9A` | `--color-ring` | `focus-visible: ring` |

**Rules:**
- Warm (`--color-billing-warn` / `--color-billing-block`) is **reserved for billing states**. Never use amber/orange/red for decoration, badges, or marketing accents.
- Success and error must remain distinguishable under deuteranopia: pair color with icon + label (`at_risk` / `blocked` / `active`).
- No purple, no indigo wash, no gradient meshes, no glassmorphism.

### Typography

| Role | Family | Notes |
|------|--------|-------|
| UI / display | **IBM Plex Sans** | Geometric neo-grotesque; headings 500–600, body 400 |
| Mono / instrumentation | **JetBrains Mono** | `font-variant-numeric: tabular-nums` **always** |

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

**Mono required for:** currency, durations, FPS, latency, model IDs, hashes, API keys, orchestrator IDs, code.

**Numeric display:**
- Internal precision: 6 decimal places (USD micros → dollars).
- Display: **3 decimal places** for USD (`$0.031`), 1 decimal for seconds (`14.2s`), integer FPS.

**Scale (8px rhythm):**

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `--text-xs` | 12px | 400/500 | Labels, table meta |
| `--text-sm` | 14px | 400 | Body dense / runs table |
| `--text-base` | 16px | 400 | Marketing body |
| `--text-lg` | 18px | 500 | Section intros |
| `--text-xl` | 24px | 600 | Section titles |
| `--text-2xl` | 32px | 600 | Page titles |
| `--text-hero` | 48–56px | 600 | Marketing H1 only; tracking −0.02em |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Icon gaps |
| `--space-sm` | `8px` | Inline |
| `--space-md` | `16px` | Standard padding |
| `--space-lg` | `24px` | Panel padding |
| `--space-xl` | `32px` | Section gaps |
| `--space-2xl` | `48px` | Major sections |
| `--space-3xl` | `64px` | Hero vertical |

App chrome is **data-dense** (8–12px gaps). Marketing uses `--space-2xl`+ between sections.

### Elevation & borders

Prefer **1px borders** over shadows on OLED. Soft shadow only for floating layers (menus, dialogs).

| Level | Treatment |
|-------|-----------|
| Flat | `bg-canvas`, no border |
| Panel | `bg-surface` + `border-border` |
| Float | `bg-elevated` + `border-border-strong` + `shadow-lg` (rgba black 40%) |
| Modal scrim | `rgba(0,0,0,0.55)` — no blur glass |

### Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `4px` | Chips, ports |
| `--radius-md` | `8px` | Inputs, buttons, run rows |
| `--radius-lg` | `12px` | Panels |
| `--radius-full` | `9999px` | **Avoid** for marketing chips; OK for live pulse dot only |

### Motion

Restrained. Data along an edge; progress ring; live cost tick. **No parallax.**

| Token | Value |
|-------|-------|
| `--motion-fast` | 150ms |
| `--motion-base` | 200ms |
| `--motion-slow` | 300ms |
| Easing enter | `ease-out` |
| Easing exit | `ease-in` |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Live tickers / edge-flow animations must offer **pause** and freeze under reduced motion.

### Icons

- Library: **Lucide** (stroke 1.5; 1.75 for Activity ≥16px).
- No emoji as icons. No crypto glyphs (chains, coins, blocks). No AI sparkles.

---

## Style synthesis

| Source | Take |
|--------|------|
| Dark Mode (OLED) | Near-black canvas, low white emission, high contrast |
| Swiss Modernism 2.0 | 12-col grid, single live accent, mathematical spacing |
| Data-Dense Dashboard | App: 8–12px gaps, dense tables, KPI strips |
| Node-graph native (brief) | Edges/ports as motif; connector curves as section dividers |

**Pattern:** Real-Time / Operations Landing — hero = **live product demo**, then latency/FPS specs, then how it works, then CTA.

---

## Component specs

### Buttons

```css
.btn-primary {
  background: var(--color-live);
  color: #050507;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-family: "IBM Plex Sans", sans-serif;
  font-weight: 600;
  transition: opacity var(--motion-base) ease-out;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-ring);
}

.btn-secondary {
  background: transparent;
  color: var(--color-fg);
  border: 1px solid var(--color-border-strong);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover { background: var(--color-elevated); }

.btn-danger {
  /* billing / destructive only */
  background: var(--color-billing-block);
  color: #fff;
}
```

### Billing status banner (4 states)

Render `billing/state.explain.headline` + `explain.detail` **verbatim** from API.

| State | Border / icon color | Behavior |
|-------|---------------------|----------|
| `active` | `--color-live` | Quiet; optional |
| `overage` | `--color-overage` | Informational |
| `at_risk` | `--color-billing-warn` | Persistent banner + one-click top-up |
| `blocked` | `--color-billing-block` | Hard gate messaging; top-up CTA |

Never invent alternate billing copy.

### Balance meter

Waterfall: **included usage → prepaid → spending buffer**. Segmented bar; labels in mono tabular. Soft-negative buffer uses billing-warn only when `at_risk`.

### Run / session row

One row per `manifest_id` (`groupBy=session`): duration, orchestrator, `billableSecs`, `networkFeeUsdMicros`, fee breakdown expander, output thumbnails. Expandable detail — not a modal by default.

### API key reveal-once

Two labelled secrets:
- **API key** `pmth_…` — usage / ComfyPeer REST
- **SDK token** `app_…_…` — signer / SDK

Show once; copy buttons; mono; no recovery path in UI.

### Node-graph canvas

Pan/zoom; ports as cool dots; edges as cubic curves; executing nodes get `--color-live` pulse on border. App-shell density; marketing hero may use a simplified fixed graph.

### Resolution picker

Three presets only — Square `512×512`, Portrait `384×704`, Landscape `704×384`. Not a free text field.

### Charts (dark)

| Need | Chart | Notes |
|------|-------|-------|
| Live cost / FPS | Streaming area + KPI number | Pause control; freeze on reduced motion |
| Spend over time | Area | Cool fill, live stroke |
| Cost-per-run distribution | Histogram | Mono axis ticks |
| Pipeline breakdown | Horizontal bars | Never pie |
| Latency | Percentile strip (p50/p95/p99) | Headline spec on marketing |

### Marketing panels (not cards-as-decoration)

Marketing: prefer full-bleed sections + hairline dividers (connector curves). Cards only when they wrap an interaction (cost calculator, plan select, key reveal).

---

## Site map (v1)

| Route | Job |
|-------|-----|
| `/` | Webcam-in · prompt-live · cost-ticker hero |
| `/pricing` | Plan ladder + cost calculator + idle policy |
| `/pipelines` | Curated nodes/models/resolutions (not hand-wavy `/models`) |
| `/agents` | MCP URL + prepay (beat two; after #382) |
| `/docs` | Quickstart, bounded workflow import, CLI |
| `/network` | Transparency; crypto vocab OK here only |
| `/changelog` | Image/node releases = product releases |
| `/login` `/signup` `/app` | Auth + stream studio shell |

---

## Anti-patterns (Do NOT Use)

- ❌ Gradient meshes, glassmorphism, parallax
- ❌ Crypto iconography on marketing (chains, coins, blocks, LPT)
- ❌ Illustrated mascots / AI sparkle motifs
- ❌ Inter / Roboto / system-ui as primary display (prefer IBM Plex Sans)
- ❌ Purple / indigo theme wash
- ❌ Warm amber/orange used decoratively
- ❌ Pie charts for spend breakdown
- ❌ Freeform resolution inputs
- ❌ Promising unbounded "any ComfyUI workflow"
- ❌ Free-tier agent copy that implies $5 starter credit for agents (#409)
- ❌ Custom billing explain copy that diverges from API `explain`
- ❌ Emojis as icons
- ❌ Layout-shifting hover transforms
- ❌ Infinite decorative animation

---

## Open decisions (block design polish)

Document answers before shipping Studio / pricing final:

1. Workspaces now vs later (blocks Studio plan UI)
2. Show network cost vs ComfyPeer margin?
3. Launch pipeline allowlist (`excludedCapabilities`)
4. ~~Model storage~~ → image-baked; copy must say so
5. v1 on `main`; agents = beat two after #382
6. Free-tier human verification method (visible on signup)

---

## Pre-Delivery Checklist

- [ ] Dark-only contrast: body ≥4.5:1, secondary ≥3:1
- [ ] Billing warm colors only on `at_risk` / `blocked`
- [ ] All currency/duration/IDs in JetBrains Mono + tabular-nums
- [ ] Lucide icons only; no emoji icons
- [ ] `focus-visible` rings on all controls
- [ ] `prefers-reduced-motion` — live demo / tickers pause or freeze
- [ ] Touch targets ≥44px where interactive
- [ ] Responsive: 375 / 768 / 1024 / 1440
- [ ] Hero is webcam→prompt→output→cost, not a static mock
- [ ] `/pipelines` reflects image contents honestly
- [ ] No crypto vocabulary on `/`, `/pricing`, `/pipelines`
