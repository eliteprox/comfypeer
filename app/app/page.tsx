"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { Button } from "@/components/Button";
import { AppShell } from "@/components/AppShell";
import { StreamStudio } from "@/components/StreamStudio";
import { useAuth } from "@/components/AuthProvider";
import { PIPELINES, RESOLUTION_PRESETS, formatUsd } from "@/lib/constants";

export default function StudioPage() {
  const { user } = useAuth();
  const [pipelineId, setPipelineId] = useState<string>(PIPELINES[0]!.id);
  const [resId, setResId] = useState<string>(RESOLUTION_PRESETS[0]!.id);
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null);
  const [orchLabel, setOrchLabel] = useState<string>("—");

  useEffect(() => {
    if (!user) return;
    void fetch(`/api/pymthouse/account?externalUserId=${encodeURIComponent(user.id)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{
          spendableUsd?: string;
          orchestrator?: string;
        }>;
      })
      .then((data) => {
        if (!data) return;
        if (data.spendableUsd != null) {
          const n = Number(data.spendableUsd);
          setBalanceUsd(Number.isFinite(n) ? n : 0);
        }
        if (data.orchestrator) setOrchLabel(data.orchestrator);
      })
      .catch(() => null);
  }, [user]);

  const showTopUp = balanceUsd != null && balanceUsd <= 0;

  return (
    <AppShell>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3 text-xs text-muted md:text-sm">
            <span className="font-mono tabular-nums">
              balance{" "}
              <span className="text-live">
                {balanceUsd == null ? "…" : formatUsd(balanceUsd)}
              </span>
            </span>
            <span className="hidden font-mono text-faint sm:inline">orch {orchLabel}</span>
          </div>
          <Button href="/" variant="ghost" className="!px-2 !py-1 text-xs">
            Marketing
          </Button>
        </header>

        {showTopUp ? (
          <div className="border-b border-billing-warn px-4 py-2 text-sm text-billing-warn">
            <p className="font-medium">No spendable credit</p>
            <p className="text-xs opacity-90">
              Pending balance is $0.00. Add funds before starting a stream.
            </p>
            <Button href="/app/billing" variant="secondary" className="mt-2 !py-1 text-xs">
              <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={1.5} /> Top up
            </Button>
          </div>
        ) : null}

        <div className="flex-1 space-y-4 overflow-auto p-4">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs">
              <span className="text-muted">Pipeline</span>
              <select
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
                className="mt-1 block rounded-md border border-border bg-elevated px-2 py-1.5 text-sm text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
              >
                {PIPELINES.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.status !== "available"}>
                    {p.name}
                    {p.status !== "available" ? " (soon)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="text-muted">Resolution</span>
              <select
                value={resId}
                onChange={(e) => setResId(e.target.value)}
                className="mt-1 block rounded-md border border-border bg-elevated px-2 py-1.5 text-sm text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
              >
                {RESOLUTION_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} {r.width}×{r.height}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <StreamStudio pipelineId={pipelineId} resId={resId} />

          <p className="text-xs text-faint">
            Authenticated jobs use a SignerSession JWT in sessionStorage, reserve{" "}
            <span className="font-mono">comfystream</span> on the orchestrator, and stream JPEG
            frames over the orch-proxied <span className="font-mono">/ws_stream</span> WebSocket.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
