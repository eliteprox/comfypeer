"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PIPELINES, formatSecs } from "@/lib/constants";

const FILTERS = ["all", "video in", "video out", "text out", "no input"] as const;

export default function PipelinesPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const rows = useMemo(() => {
    if (filter === "all") return PIPELINES;
    return PIPELINES.filter((p) => p.modalities.some((m) => m.includes(filter)));
  }, [filter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Pipelines</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Curated nodes, models, and resolution presets baked into the BYOC image — not a
            hand-wavy &quot;any ComfyUI workflow&quot; promise.
          </p>
        </div>
        <Link href="/changelog" className="text-sm text-cool hover:underline">
          Image releases → changelog
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              filter === f
                ? "border-cool bg-cool-dim text-cool"
                : "border-border text-muted hover:border-border-strong hover:text-fg"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {rows.map((p) => (
          <article key={p.id} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium text-fg">{p.name}</h2>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-live">
                <span className="h-1.5 w-1.5 rounded-full bg-live" />
                {p.status}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-faint">{p.id}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.modalities.map((m) => (
                <span
                  key={m}
                  className="rounded border border-cool/30 bg-cool-dim/40 px-2 py-0.5 text-xs text-cool"
                >
                  {m}
                </span>
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-faint">TTFF</dt>
                <dd className="font-mono tabular-nums text-fg">{formatSecs(p.ttffMs / 1000)}</dd>
              </div>
              <div>
                <dt className="text-faint">FPS</dt>
                <dd className="font-mono tabular-nums text-fg">{p.steadyFps}</dd>
              </div>
              <div>
                <dt className="text-faint">Rate</dt>
                <dd className="font-mono tabular-nums text-live">${p.rateUsdPerSec.toFixed(3)}/s</dd>
              </div>
              <div>
                <dt className="text-faint">Resolutions</dt>
                <dd className="font-mono text-xs text-muted">{p.resolutions.join(" · ")}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">Nodes: {p.nodes.join(", ")}</p>
          </article>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Not in image — request it or wait for a changelog release.
        </p>
      ) : null}
    </div>
  );
}
