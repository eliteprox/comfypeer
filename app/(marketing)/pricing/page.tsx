"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { PIPELINES, PLANS, RESOLUTION_PRESETS, formatUsd } from "@/lib/constants";

export default function PricingPage() {
  const [pipelineId, setPipelineId] = useState<string>(PIPELINES[0]!.id);
  const [resId, setResId] = useState<string>(RESOLUTION_PRESETS[0]!.id);
  const [minutes, setMinutes] = useState(5);

  const pipeline = PIPELINES.find((p) => p.id === pipelineId) ?? PIPELINES[0]!;
  const estimate = useMemo(() => pipeline.rateUsdPerSec * minutes * 60, [pipeline, minutes]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Pricing</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Honest unit economics: dollars per second of stream time — not GPU-hour marketing math.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            id={plan.id === "studio" ? "studio" : undefined}
            className={`rounded-lg border p-5 ${
              plan.featured ? "border-live/40 bg-live-dim/20" : "border-border bg-surface"
            } ${plan.disabled ? "opacity-60" : ""}`}
          >
            <h2 className="text-base font-semibold text-fg">{plan.name}</h2>
            <p className="mt-2 font-mono text-2xl tabular-nums text-live">{plan.price}</p>
            <p className="mt-2 text-sm text-muted">{plan.detail}</p>
            <Button
              href={plan.disabled ? undefined : plan.href}
              disabled={plan.disabled}
              variant={plan.featured ? "primary" : "secondary"}
              className="mt-5 w-full"
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>

      <section className="mt-14 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-fg">Cost calculator</h2>
        <p className="mt-1 text-sm text-muted">
          Estimate from retail rate × duration. Resolution presets only.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-muted">Pipeline</span>
            <select
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2 text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
            >
              {PIPELINES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Resolution</span>
            <select
              value={resId}
              onChange={(e) => setResId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2 text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
            >
              {RESOLUTION_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} {r.width}×{r.height}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Minutes</span>
            <input
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono tabular-nums text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
            />
          </label>
        </div>
        <p className="mt-6 font-mono text-2xl tabular-nums text-live">
          {formatUsd(estimate)}{" "}
          <span className="text-sm text-muted">
            @ {formatUsd(pipeline.rateUsdPerSec)}/s · {minutes} min
          </span>
        </p>
      </section>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-base font-semibold text-fg">Idle / pause policy</h2>
        <p className="mt-2 text-sm text-muted">
          Workers are capacity-1. If frames stop for ~60s we disconnect and stop accruing
          billable seconds. Pausing the demo ticker locally does not pause a live worker — stop
          the stream in studio when you step away.
        </p>
        <h2 className="mt-6 text-base font-semibold text-fg">Free tier</h2>
        <p className="mt-2 text-sm text-muted">
          Human-verified · $5 included · no overage. Agents must prepay — they do not receive
          the human starter credit.
        </p>
      </section>
    </div>
  );
}
