"use client";

import { useState } from "react";
import Link from "next/link";
import {
  NOT_YET_MEASURED,
  PIPELINES,
  REMOTE_MODELS,
  formatSecs,
  formatUsd,
  starterWorkflowById,
} from "@/lib/constants";
import { WorkflowDownload } from "@/components/WorkflowDownload";

function CopyModelId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <code className="font-mono text-xs text-faint">{id}</code>
      <button
        type="button"
        onClick={() => void onCopy()}
        className="inline-flex min-h-11 items-center rounded-md border border-border-strong px-3 text-xs text-fg hover:bg-elevated focus-visible:ring-2 focus-visible:ring-ring"
      >
        Copy
      </button>
      <span aria-live="polite" className="text-xs text-live">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}

export default function PipelinesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Remote models</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Remote models the nodes can call. Set model_id on TrickleConfig, or wire model_id_out from
        a pipeline config node.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {REMOTE_MODELS.map((model) => {
          const workflow = starterWorkflowById(model.workflowId);
          return (
            <article key={model.id} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium text-fg">{model.name}</h2>
                <span className="font-mono text-xs text-muted">{model.status}</span>
              </div>
              <CopyModelId id={model.id} />
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-faint">Rate</dt>
                  <dd className="font-mono text-fg">
                    {typeof model.rateUsdPerSec === "number"
                      ? `${formatUsd(model.rateUsdPerSec)}/s`
                      : NOT_YET_MEASURED}
                  </dd>
                </div>
                <div>
                  <dt className="text-faint">TTFF</dt>
                  <dd className="font-mono text-fg">
                    {typeof model.ttffMs === "number"
                      ? formatSecs(model.ttffMs / 1000)
                      : NOT_YET_MEASURED}
                  </dd>
                </div>
              </dl>
              {workflow ? (
                <p className="mt-4 text-sm">
                  <WorkflowDownload id={workflow.id}>Starter workflow: {workflow.title}</WorkflowDownload>
                  <span className="mt-1 block text-xs text-faint">Needs {workflow.needs}.</span>
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <details className="mt-12 rounded-lg border border-border bg-surface p-5">
        <summary className="cursor-pointer text-base font-semibold text-fg">
          Web studio pipelines
        </summary>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          These run in the browser studio. They are not Desktop model ids. Coming pipelines are{" "}
          {NOT_YET_MEASURED}.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PIPELINES.map((pipeline) => {
            const measured = pipeline.status === "available";
            return (
              <article key={pipeline.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium text-fg">{pipeline.name}</h3>
                  <span className="font-mono text-xs text-muted">{pipeline.status}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-faint">{pipeline.id}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-faint">TTFF</dt>
                    <dd className="font-mono text-fg">
                      {measured ? formatSecs(pipeline.ttffMs / 1000) : NOT_YET_MEASURED}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">FPS</dt>
                    <dd className="font-mono text-fg">
                      {measured ? pipeline.steadyFps : NOT_YET_MEASURED}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Rate</dt>
                    <dd className="font-mono text-live">
                      {measured ? `${formatUsd(pipeline.rateUsdPerSec)}/s` : NOT_YET_MEASURED}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Resolutions</dt>
                    <dd className="font-mono text-xs text-muted">{pipeline.resolutions.join(" · ")}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-sm">
          <Link href="/app/studio" className="text-cool hover:underline">
            Open the browser studio
          </Link>
          <span className="text-muted"> · </span>
          <Link href="/changelog" className="text-cool hover:underline">
            Changelog
          </Link>
        </p>
      </details>
    </div>
  );
}
