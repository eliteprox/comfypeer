import { Button } from "@/components/Button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agents",
};

const MCP_URL =
  process.env.NEXT_PUBLIC_PYMTHOUSE_MCP_URL ?? "https://staging.pymthouse.com/api/v1/mcp";

const SNIPPET = `# Agent self-registration (Ed25519) — requires PymtHouse #382
# 1. GET /api/v1/network/register/challenge
# 2. Sign challenge with your Ed25519 private key
# 3. POST /api/v1/network/register → one-time app_*_* key
# 4. Bearer that key against MCP:

curl -s ${MCP_URL} \\
  -H "Authorization: Bearer app_<id>_<secret>" \\
  -H "Content-Type: application/json"

# Tools: list_workflows · run_workflow · start_stream
#         update_stream · get_stream · stop_stream
# start_stream requires max_duration_s + max_spend_usd`;

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Agents</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Paste the MCP URL into your client. Your agent registers itself, prepays, and drives
        workflows — including <span className="font-mono text-fg">update_stream</span> on a live
        session.
      </p>

      <div className="mt-6 rounded-lg border border-billing-warn/40 bg-elevated p-4">
        <p className="text-sm text-billing-warn">
          Agents must prepay. The $5 starter credit is for verified humans only — agents do not
          receive it.
        </p>
      </div>

      <div className="mt-8">
        <label className="text-xs font-medium text-muted">MCP endpoint</label>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
          <code className="flex-1 break-all font-mono text-sm text-live">{MCP_URL}</code>
          <Button href="/pricing" variant="secondary" className="shrink-0">
            Prepay $10
          </Button>
        </div>
      </div>

      <pre className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted">
        {SNIPPET}
      </pre>

      <p className="mt-6 text-sm text-muted">
        Ship narrative: an agent watches a stream, describes what it sees (
        <span className="font-mono">analyze</span>), and restyles it via{" "}
        <span className="font-mono">update_stream</span> — no human in the loop. Manifest:{" "}
        <span className="font-mono text-fg">comfypeer-mcp</span> (coming with beat two).
      </p>
    </div>
  );
}
