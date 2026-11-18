"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { PIPELINES, PLANS, formatUsd } from "@/lib/constants";

export default function PricingPage() {
  const available = PIPELINES.filter((pipeline) => pipeline.status === "available");
  const [pipelineId, setPipelineId] = useState<string>(available[0]?.id ?? "");
  const [minutes, setMinutes] = useState(5);

  const pipeline = available.find((item) => item.id === pipelineId) ?? available[0];
  const estimate = useMemo(() => {
    if (!pipeline) return null;
    return pipeline.rateUsdPerSec * minutes * 60;
  }, [pipeline, minutes]);
  const minuteExample = pipeline ? pipeline.rateUsdPerSec * 60 : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Pricing</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Dollars per second of stream time. The same balance is used by ComfyUI Desktop and the web
        studio.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            id={plan.id}
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
              className="mt-5 min-h-11 w-full"
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-sm text-muted">
        Free credit for verified GitHub accounts is not available yet.
      </p>

      <section className="mt-14 max-w-2xl">
        <h2 className="text-lg font-semibold text-fg">How the balance works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Starter credit, when it is granted.</li>
          <li>Prepaid balance you add.</li>
          <li>Optional auto top-up.</li>
        </ol>
        <p className="mt-3 text-sm">
          <Link href="/app/billing" className="text-cool hover:underline">
            Billing
          </Link>
        </p>
      </section>

      {pipeline && minuteExample != null ? (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-lg font-semibold text-fg">Worked example</h2>
          <p className="mt-2 text-sm text-muted">
            {pipeline.name} on the web studio is {formatUsd(pipeline.rateUsdPerSec)}/s. Sixty
            seconds is {formatUsd(minuteExample)}. That figure is this pipeline&apos;s web-studio
            rate, not a Desktop model rate.
          </p>
        </section>
      ) : null}

      {pipeline && estimate != null ? (
        <section className="mt-10 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-fg">Web studio estimate</h2>
          <p className="mt-1 text-sm text-muted">
            Computed from the measured web-studio rate for the pipeline you pick. Desktop model
            rates are not yet measured, so they are not in this estimate.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted">Web studio pipeline</span>
              <select
                value={pipeline.id}
                onChange={(event) => setPipelineId(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-elevated px-3 py-2 text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
              >
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
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
                onChange={(event) => setMinutes(Math.max(1, Number(event.target.value) || 1))}
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-elevated px-3 py-2 font-mono tabular-nums text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
              />
            </label>
          </div>
          <p className="mt-6 font-mono text-2xl tabular-nums text-live">
            {formatUsd(estimate)}{" "}
            <span className="text-sm text-muted">
              @ {formatUsd(pipeline.rateUsdPerSec)}/s · {minutes} min · {pipeline.name}
            </span>
          </p>
        </section>
      ) : null}
    </div>
  );
}
