import { ArrowRight, Gauge, GitBranch, Workflow } from "lucide-react";
import { Button } from "@/components/Button";
import { LiveDemoWidget } from "@/components/LiveDemoWidget";
import { PIPELINES, formatSecs } from "@/lib/constants";
import Link from "next/link";

export default function HomePage() {
  const featured = PIPELINES[0]!;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-8 max-w-3xl">
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
            Real-time AI video from your own ComfyUI graph.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Point a camera at it, change the prompt while it&apos;s running, and watch the output
            change in the same second. On Livepeer. Billed by the second.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/signup">Start free</Button>
            <Button href="/app" variant="secondary">
              Open studio
            </Button>
          </div>
        </div>
        <LiveDemoWidget />
      </section>

      <ConnectorDivider />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-fg">Latency is the headline</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Warmup is visible. We measure it and own it — time-to-first-frame and steady-state FPS
          for featured pipelines.
        </p>
        <div className="mt-8 overflow-hidden rounded-lg border border-border">
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
              {PIPELINES.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 text-fg">{p.name}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted">
                    {formatSecs(p.ttffMs / 1000)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted">{p.steadyFps}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-live">
                    ${p.rateUsdPerSec.toFixed(3)}/s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-xs text-faint">
          Featured: {featured.id} · resolutions are picklist-only (engines baked in image)
        </p>
      </section>

      <ConnectorDivider />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-fg">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Workflow,
              title: "Import your graph",
              body: "Drop a ComfyUI workflow JSON built from our supported nodes and models.",
            },
            {
              icon: GitBranch,
              title: "Run on Livepeer BYOC",
              body: "A dedicated worker holds your stream (capacity 1). Prompt updates apply mid-flight.",
            },
            {
              icon: Gauge,
              title: "Pay billable seconds",
              body: "Metered from signed network receipts via PymtHouse — to the microdollar.",
            },
          ].map((step, i) => (
            <li key={step.title} className="relative">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cool/40 bg-cool-dim font-mono text-xs text-cool">
                  {i + 1}
                </span>
                <step.icon className="h-4 w-4 text-cool" strokeWidth={1.5} />
              </div>
              <h3 className="font-medium text-fg">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <ConnectorDivider />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-fg">Bounded portability</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Same Comfy graph — if every node and checkpoint is in our image. Custom LoRAs and
          arbitrary node packs are not magic; check the curated list.
        </p>
        <Link
          href="/pipelines"
          className="mt-4 inline-flex items-center gap-1 text-sm text-cool hover:underline"
        >
          Browse pipelines <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-fg">Ready to stream?</h2>
            <p className="mt-1 text-sm text-muted">
              Human-verified free tier · $5 included · no agent free credit.
            </p>
          </div>
          <Button href="/signup">
            Start free <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
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
