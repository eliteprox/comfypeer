"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { WorkflowDownload } from "@/components/WorkflowDownload";
import { useAuth } from "@/components/AuthProvider";
import { accountChecklist, creditRunwayMinutes } from "@/lib/account-checklist";
import { includedUsageSummary } from "@/lib/included-usage";
import {
  FIRST_RUN_WORKFLOW_ID,
  INSTALL,
  formatUsd,
  measuredDesktopRateUsdPerSec,
  starterWorkflowById,
} from "@/lib/constants";

type WalletResponse = {
  credits: { live: string; pending: string; currency?: string };
  autoTopUp?: { enabled: boolean; amountUsd: string | null } | null;
  billingState?: unknown;
};

export function AccountOverview() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [fallbackSpendable, setFallbackSpendable] = useState<number | null>(null);
  const [balanceUnavailable, setBalanceUnavailable] = useState(false);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const firstRun = starterWorkflowById(FIRST_RUN_WORKFLOW_ID);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const qs = `externalUserId=${encodeURIComponent(user.id)}`;

    void (async () => {
      try {
        const response = await fetch(`/api/pymthouse/wallet?${qs}`);
        if (!response.ok) throw new Error("wallet");
        const body = (await response.json()) as WalletResponse;
        if (!cancelled) setWallet(body);
      } catch {
        try {
          const response = await fetch(`/api/pymthouse/account?${qs}`);
          if (!response.ok) throw new Error("account");
          const body = (await response.json()) as { spendableUsd?: string };
          const amount = Number(body.spendableUsd);
          if (!cancelled && Number.isFinite(amount)) setFallbackSpendable(amount);
          else if (!cancelled) setBalanceUnavailable(true);
        } catch {
          if (!cancelled) setBalanceUnavailable(true);
        }
      }
    })();

    void fetch("/api/pymthouse/usage")
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { requestCount?: unknown };
        if (typeof body.requestCount === "number" && Number.isFinite(body.requestCount) && !cancelled) {
          setRequestCount(body.requestCount);
        }
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [user]);

  const walletSpendable = wallet ? Number(wallet.credits.live) : null;
  const spendable =
    walletSpendable != null && Number.isFinite(walletSpendable) ? walletSpendable : fallbackSpendable;
  const pending = wallet ? Number(wallet.credits.pending) : null;
  const included = wallet ? includedUsageSummary(wallet.billingState) : null;
  const autoTopUp = wallet ? Boolean(wallet.autoTopUp?.enabled) : null;
  const checklist = accountChecklist({
    userPresent: Boolean(user),
    spendableUsd: spendable,
    requestCount,
    autoTopUp,
  });
  const runway = creditRunwayMinutes(spendable ?? 0, measuredDesktopRateUsdPerSec());

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold text-fg">Account</h1>
        <p className="mt-1 text-sm text-muted">
          This ComfyPeer account is what {INSTALL.displayName} uses in ComfyUI Desktop.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-fg">ComfyUI Desktop</h2>
        <p className="mt-2 text-sm text-muted">
          Sign in on the canvas. {INSTALL.displayName} sits at the lower right of ComfyUI. Choose
          Sign in, then approve the code in this browser. This page does not check whether Desktop
          is connected.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-fg">Balance</h2>
        {balanceUnavailable && spendable == null ? (
          <p className="mt-2 text-sm text-muted">Balance unavailable.</p>
        ) : (
          <dl className="mt-3 space-y-2 text-sm">
            {included ? (
              <div className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-muted">Included</dt>
                <dd className="font-mono tabular-nums text-fg">
                  ${included.remainingUsd} of ${included.totalUsd}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted">Prepaid</dt>
              <dd className="font-mono tabular-nums text-live">
                {spendable == null ? "…" : formatUsd(spendable)}
              </dd>
            </div>
            {pending != null && Number.isFinite(pending) && pending > 0 ? (
              <div className="flex justify-between gap-4 border-b border-border py-2">
                <dt className="text-muted">Pending, not spendable</dt>
                <dd className="font-mono tabular-nums text-fg">{formatUsd(pending)}</dd>
              </div>
            ) : null}
          </dl>
        )}
        {runway != null ? (
          <p className="mt-3 text-sm text-muted">
            About {runway.toFixed(0)} minutes at the measured Desktop rate.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">
            {wallet
              ? autoTopUp
                ? `Auto top-up is on${
                    wallet.autoTopUp?.amountUsd ? ` at $${wallet.autoTopUp.amountUsd}` : ""
                  }.`
                : "Auto top-up is off."
              : "Auto top-up status unavailable."}
          </p>
          <Button href="/app/billing" variant="secondary" className="min-h-11">
            {autoTopUp === false ? "Turn on" : "Billing"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-fg">Checklist</h2>
        {checklist.collapsed ? (
          <p className="mt-2 text-sm text-muted">
            All set.{" "}
            <Link href="/app/usage" className="text-cool hover:underline">
              Usage
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {checklist.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 border-b border-border py-2">
                <span className="text-fg">{item.label}</span>
                <span className={`font-mono text-xs ${item.done ? "text-live" : "text-faint"}`}>
                  {item.done ? "Done" : "Not yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {firstRun ? (
          <p className="mt-4 text-sm">
            <WorkflowDownload id={firstRun.id}>Download {firstRun.title}</WorkflowDownload>
            <span className="mt-1 block text-xs text-faint">Needs {firstRun.needs}.</span>
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-base font-semibold text-fg">Recent activity</h2>
        <p className="mt-2 text-sm">
          <Link href="/app/usage" className="text-cool hover:underline">
            Usage
          </Link>
        </p>
        {requestCount != null && requestCount > 0 ? (
          <p className="mt-2 font-mono text-sm tabular-nums text-fg">{requestCount} requests</p>
        ) : null}
      </section>
    </div>
  );
}
