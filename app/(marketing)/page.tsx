import { Download, LogIn, Play } from "lucide-react";
import Link from "next/link";
import { CopyText } from "@/components/CopyText";
import { ClosingActions, HeroActions } from "@/components/HeroActions";
import { HeroDiagram } from "@/components/HeroDiagram";
import { LiveDemoWidget } from "@/components/LiveDemoWidget";
import { WorkflowDownload } from "@/components/WorkflowDownload";
import {
  FIRST_RUN_WORKFLOW_ID,
  INSTALL,
  NOT_YET_MEASURED,
  PIPELINES,
  REMOTE_MODELS,
  formatSecs,
  formatUsd,
  starterWorkflowById,
} from "@/lib/constants";

const STEPS = [
  {
    icon: Download,
    title: "Install",
    body: `Search ComfyUI Manager for "${INSTALL.managerSearch}", or paste the CLI command, then restart. The Trickle category appears after the restart.`,
  },
  {
    icon: LogIn,
    title: "Sign in on the canvas",
    body: "Create a ComfyPeer account. In ComfyUI Desktop, choose Sign in at the lower right and approve the code.",
  },
  {
    icon: Play,
    title: "Run a starter workflow",
    body: "Download the first-run graph, drag it onto the canvas, and queue it. Frames leave through TrickleFrameOutput.",
  },
] as const;

export default function HomePage() {
  const firstRun = starterWorkflowById(FIRST_RUN_WORKFLOW_ID);
  const measured = PIPELINES.filter((pipeline) => pipeline.status === "available");
  const featured = measured[0];
  const perHour = featured ? featured.rateUsdPerSec * 60 * 60 : null;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-8 max-w-3xl">
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
            Stream real-time video from ComfyUI Desktop.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Install Livepeer AI Streaming, sign in with a ComfyPeer account, and send frames from
            your own graph to GPUs on Livepeer. Billed by the second.
          </p>
          <HeroActions />
          <div className="mt-6 space-y-3">
            <CopyText label="Manager search" value={INSTALL.managerSearch} />
            <CopyText label="CLI" value={INSTALL.cliCommand} mono />
          </div>
          <p className="mt-3 text-sm text-muted">ComfyUI Desktop runs on Windows and macOS.</p>
        </div>
        <HeroDiagram />
      </section>

      <ConnectorDivider />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-fg">Three steps</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cool/40 bg-cool-dim font-mono text-xs text-cool">
                  {index + 1}
                </span>
                <step.icon className="h-4 w-4 text-cool" strokeWidth={1.5} />
              </div>
              <h3 className="font-medium text-fg">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{step.body}</p>
              {step.title === "Run a starter workflow" && firstRun ? (
                <p className="mt-3 text-sm">
                  <WorkflowDownload id={firstRun.id} className="inline-flex min-h-11 items-center text-cool hover:underline">
                    Download {firstRun.title}
                  </WorkflowDownload>
                  <span className="mt-1 block text-xs text-faint">Needs {firstRun.needs}.</span>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <ConnectorDivider />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-fg">Remote model rates</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Desktop models the nodes can call. A cell stays {NOT_YET_MEASURED} until we have a number.
        </p>
        <div className="mt-8 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">TTFF</th>
              </tr>
            </thead>
            <tbody>
              {REMOTE_MODELS.map((model) => (
                <tr key={model.id} className="border-t border-border">
                  <td className="px-4 py-3 text-fg">
                    {model.name}
                    <span className="mt-1 block font-mono text-xs text-faint">{model.id}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{model.status}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {typeof model.rateUsdPerSec === "number"
                      ? `${formatUsd(model.rateUsdPerSec)}/s`
                      : NOT_YET_MEASURED}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {typeof model.ttffMs === "number" ? formatSecs(model.ttffMs / 1000) : NOT_YET_MEASURED}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConnectorDivider />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-fg">Browser preview</h2>
        <div className="mt-8">
          <LiveDemoWidget />
        </div>
      </section>

      <ConnectorDivider />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-fg">Web studio, measured</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Time-to-first-frame and steady FPS for web-studio pipelines that are available. Desktop
          model rates are separate, and they are {NOT_YET_MEASURED}.
        </p>
        <div className="mt-8 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Pipeline</th>
                <th className="px-4 py-3 font-medium">TTFF</th>
                <th className="px-4 py-3 font-medium">Steady FPS</th>
                <th className="px-4 py-3 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {measured.map((pipeline) => (
                <tr key={pipeline.id} className="border-t border-border">
                  <td className="px-4 py-3 text-fg">{pipeline.name}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted">
                    {formatSecs(pipeline.ttffMs / 1000)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted">{pipeline.steadyFps}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-live">
                    ${pipeline.rateUsdPerSec.toFixed(3)}/s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {featured && perHour != null ? (
          <p className="mt-3 text-sm text-muted">
            Web-studio passthrough rate for {featured.name}: {formatUsd(featured.rateUsdPerSec)}/s (
            {formatUsd(perHour)}/hour). This is the web-studio passthrough rate, not a Desktop model
            rate.
          </p>
        ) : null}
        <p className="mt-3 font-mono text-xs text-faint">
          Featured: {featured?.id ?? "—"} · resolutions are picklist-only (engines baked in image)
        </p>
        <Link href="/pipelines" className="mt-4 inline-flex min-h-11 items-center text-sm text-cool hover:underline">
          Remote models
        </Link>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-fg">Install {INSTALL.displayName}</h2>
            <p className="mt-1 text-sm text-muted">
              Then create a ComfyPeer account and sign in on the canvas.
            </p>
          </div>
          <ClosingActions />
        </div>
      </section>
    </>
  );
}

function ConnectorDivider() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6" aria-hidden>
      <svg className="h-6 w-full text-cool-dim" viewBox="0 0 800 24" preserveAspectRatio="none">
        <circle cx="8" cy="12" r="3" fill="currentColor" />
        <path
          d="M11 12 C200 4, 600 20, 789 12"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          className="edge-flow"
        />
        <circle cx="792" cy="12" r="3" fill="var(--color-live)" />
      </svg>
    </div>
  );
}
