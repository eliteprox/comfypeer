"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatUsd } from "@/lib/constants";

type UsageSummary = {
  availableUsd: string;
  pendingUsd: string;
  requestCount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

export default function UsagePage() {
  return (
    <AppShell>
      <UsageBody />
    </AppShell>
  );
}

function UsageBody() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/pymthouse/usage")
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as UsageSummary & {
          error?: string;
        };
        if (!response.ok) throw new Error(body.error || "Failed to load usage");
        return body;
      })
      .then((body) => {
        if (!cancelled) setUsage(body);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load usage");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const available = usage ? Number(usage.availableUsd) : null;
  const pending = usage ? Number(usage.pendingUsd) : null;
  const period =
    usage?.periodStart || usage?.periodEnd
      ? `${usage.periodStart ?? "…"} – ${usage.periodEnd ?? "…"}`
      : "Current period";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-fg">Usage</h1>
      <p className="mt-1 text-sm text-muted">
        Available credit is the prepaid balance shown in the studio. Request counts come from the
        same usage feed as the ComfyUI account panel.
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-billing-block">
          {error}
        </p>
      ) : null}
      <dl className="mt-6 space-y-2 text-sm">
        <Row label="Available credit" value={available == null ? "…" : formatUsd(available)} live />
        <Row
          label="Pending"
          value={pending == null || !Number.isFinite(pending) ? "…" : formatUsd(pending)}
        />
        <Row
          label="Requests"
          value={usage ? String(usage.requestCount) : "…"}
        />
        <Row label="Period" value={usage ? period : "…"} />
      </dl>
    </div>
  );
}

function Row({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-mono tabular-nums ${live ? "text-live" : "text-fg"}`}>{value}</dd>
    </div>
  );
}
