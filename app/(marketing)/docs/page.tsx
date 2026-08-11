import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Docs</h1>
      <p className="mt-2 text-muted">Quickstart for humans. Agents: see <Link href="/agents" className="text-cool hover:underline">/agents</Link>.</p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-fg">1. Sign up</h2>
        <p className="text-sm text-muted">
          Create an account at <Link href="/signup" className="text-cool hover:underline">/signup</Link>.
          We provision a PymtHouse end-user and mint a user JWT server-side (never in the browser).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-fg">2. Start a stream</h2>
        <p className="text-sm text-muted">
          Open <Link href="/app" className="text-cool hover:underline">studio</Link>, pick a
          resolution preset (512² / 384×704 / 704×384), set a prompt, hit Run. Mid-stream prompt
          updates call <span className="font-mono text-fg">update_params</span>.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-fg">3. Import a workflow</h2>
        <p className="text-sm text-muted">
          Upload ComfyUI JSON built from nodes in our image. Graphs with unsupported nodes fail
          honestly — check <Link href="/pipelines" className="text-cool hover:underline">/pipelines</Link>.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-fg">4. API keys</h2>
        <p className="text-sm text-muted">
          From Settings: <span className="font-mono text-fg">pmth_…</span> for usage reads, and
          composite <span className="font-mono text-fg">app_…_…</span> SDK token for signer /
          webhooks. Shown once.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-fg">CLI (device flow)</h2>
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs text-muted">
{`comfypeer login
# prints a code → opens issuer device page
# approve → land on /device-approved`}
        </pre>
      </section>
    </div>
  );
}
