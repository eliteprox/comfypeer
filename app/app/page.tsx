"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CircleDollarSign,
  KeyRound,
  LayoutGrid,
  LogOut,
  Settings,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/Button";
import { LiveDemoWidget } from "@/components/LiveDemoWidget";
import { useAuth } from "@/components/AuthProvider";
import { PIPELINES, RESOLUTION_PRESETS, formatUsd } from "@/lib/constants";

type BillingBanner = {
  state: "active" | "overage" | "at_risk" | "blocked";
  headline: string;
  detail: string;
};

export default function StudioPage() {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const [pipelineId, setPipelineId] = useState<string>(PIPELINES[0]!.id);
  const [resId, setResId] = useState<string>(RESOLUTION_PRESETS[0]!.id);
  const [banner, setBanner] = useState<BillingBanner | null>(null);
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null);
  const [orchLabel, setOrchLabel] = useState<string>("—");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    void fetch(`/api/pymthouse/account?externalUserId=${encodeURIComponent(user.id)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{
          balanceUsdMicros?: string;
          billing?: BillingBanner | null;
          orchestrator?: string;
        }>;
      })
      .then((data) => {
        if (!data) return;
        if (data.balanceUsdMicros != null) {
          setBalanceUsd(Number(data.balanceUsdMicros) / 1_000_000);
        }
        if (data.billing) setBanner(data.billing);
        if (data.orchestrator) setOrchLabel(data.orchestrator);
      })
      .catch(() => null);
  }, [user]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        Loading studio…
      </div>
    );
  }

  const bannerClass =
    banner?.state === "blocked"
      ? "border-billing-block text-billing-block"
      : banner?.state === "at_risk"
        ? "border-billing-warn text-billing-warn"
        : banner?.state === "overage"
          ? "border-overage text-overage"
          : "border-live text-live";

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <LogoMark size={22} />
          <span className="text-sm font-semibold">Studio</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2 text-sm">
          <NavItem href="/app" icon={Activity} label="Stream" active />
          <NavItem href="/pipelines" icon={LayoutGrid} label="Pipelines" />
          <NavItem href="/app/settings" icon={Settings} label="Settings" />
          <NavItem href="/app/settings#keys" icon={KeyRound} label="API keys" />
        </nav>
        <div className="border-t border-border p-3">
          <p className="truncate text-xs text-muted">{user.email}</p>
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-faint hover:text-fg"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} /> Sign out
          </button>
        </div>
      </aside>

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

        {banner && banner.state !== "active" ? (
          <div className={`border-b px-4 py-2 text-sm ${bannerClass}`}>
            <p className="font-medium">{banner.headline}</p>
            <p className="text-xs opacity-90">{banner.detail}</p>
            {(banner.state === "at_risk" || banner.state === "blocked") && (
              <Button href="/app/settings#billing" variant="secondary" className="mt-2 !py-1 text-xs">
                <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={1.5} /> Top up
              </Button>
            )}
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
                  <option key={p.id} value={p.id}>
                    {p.name}
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

          <LiveDemoWidget />

          <p className="text-xs text-faint">
            First run tip: start the stream above. Idle disconnect fires around 60s without frames.
            Workflow errors show a passthrough overlay and stop billable accrual while degraded.
          </p>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof Activity;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
        active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </Link>
  );
}
