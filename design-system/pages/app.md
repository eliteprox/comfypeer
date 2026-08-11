# Page override: `/app` (Stream studio shell)

## Job

Operate a live ComfyStream session: preview, prompt, params, billing awareness.

## Layout

```
┌──────── sidebar (pipelines, runs) ──┬──────── main ─────────────────────────┐
│                                     │  input preview │ output preview        │
│                                     │  prompt + update_params                │
│                                     │  resolution presets · FPS · cost tick  │
│                                     ├────────────────────────────────────────┤
│                                     │  billing banner (if not active)       │
└─────────────────────────────────────┴────────────────────────────────────────┘
```

Data-dense: `--space-sm`/`md`, 12–14px UI text. Swiss grid; no marketing hero spacing.

## Critical UX policies (product + UI)

| Event | UI |
|-------|-----|
| `at_risk` | Billing-warn banner + one-click top-up **without** dropping stream |
| `blocked` | Policy choice: hard-cut vs grace — must be explicit in UI copy |
| Workflow error mid-stream | Passthrough + visible overlay; **stop billable accrual** while degraded |
| No frames ~60s | Idle disconnect warning → disconnect (if metering is wall-clock) |

## Components in scope

Node-graph (optional advanced tab), run rows, balance meter, key settings elsewhere under `/app/settings`.
