"use client";

import { useCallback, useEffect, useState } from "react";
import type { BillingState } from "@pymthouse/builder-sdk";
import { Button } from "@/components/Button";
import {
  availableRunway,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatWalletUsd,
  spendPostureBadge,
  type SpendPostureTone,
} from "@/lib/billing-display";
import {
  formatTopUpUsdLabel,
  parseTopUpAmountUsd,
  sanitizeTopUpAmountInput,
  TOP_UP_MAX_USD,
  TOP_UP_MIN_USD,
} from "@/lib/top-up-amount";

type Invoice = {
  id: string;
  number?: string;
  status: string;
  currency: string;
  totalAmount: string;
  issuedAt?: string;
  periodEnd?: string;
  invoiceType?: string;
};

type LedgerEntry = {
  id: string;
  date: string;
  type: "credit_purchased" | "usage" | "invoice" | "refund";
  description: string;
  amountUsdMicros: string;
  creditDeltaUsdMicros: string;
  balanceUsdMicros: string | null;
  derived: boolean;
  status?: string | null;
  invoiceId?: string | null;
  hostedInvoiceUrl?: string | null;
};

type PaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  isDefault: boolean;
};

type Balance = {
  balanceUsdMicros: string;
  consumedUsdMicros: string;
  lifetimeGrantedUsdMicros: string;
};

const QUICK_AMOUNTS = [1, 10, 25, 100] as const;

const POSTURE_CLASS: Record<SpendPostureTone, string> = {
  ok: "border-live/40 text-live",
  info: "border-cool/40 text-cool",
  warn: "border-billing-warn/40 text-billing-warn",
  danger: "border-billing-block/40 text-billing-block",
};

const RUNWAY_CLASS: Record<SpendPostureTone, string> = {
  ok: "text-fg",
  info: "text-fg",
  warn: "text-billing-warn",
  danger: "text-billing-block",
};

function redirectToCheckout(url: string): void {
  const parsed = new URL(url);
  const ok =
    parsed.protocol === "https:" &&
    (parsed.hostname === "checkout.stripe.com" ||
      parsed.hostname.endsWith(".stripe.com"));
  if (!ok) throw new Error("Checkout URL host is not allowed.");
  window.location.assign(parsed.toString());
}

export function BillingPanel({ externalUserId }: { externalUserId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [billingState, setBillingState] = useState<BillingState | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [amountInput, setAmountInput] = useState("10");
  const [busy, setBusy] = useState<"topup" | "pm" | "test-usage" | string | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = `externalUserId=${encodeURIComponent(externalUserId)}`;
    try {
      const [walletRes, invRes, txRes, pmRes] = await Promise.all([
        fetch(`/api/pymthouse/wallet?${qs}`),
        fetch(`/api/pymthouse/wallet/invoices?${qs}&pageSize=20`),
        fetch(`/api/pymthouse/wallet/transactions?${qs}`),
        fetch(`/api/pymthouse/wallet/payment-methods?${qs}`),
      ]);
      if (!walletRes.ok) {
        const body = (await walletRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load billing");
      }
      const wallet = (await walletRes.json()) as {
        balance: Balance;
        billingState: BillingState;
      };
      setBalance(wallet.balance);
      setBillingState(wallet.billingState);

      if (invRes.ok) {
        const inv = (await invRes.json()) as { items?: Invoice[] };
        setInvoices(inv.items ?? []);
      } else {
        setInvoices([]);
      }

      if (txRes.ok) {
        const tx = (await txRes.json()) as { items?: LedgerEntry[] };
        setLedger(tx.items ?? []);
      } else {
        setLedger([]);
      }

      if (pmRes.ok) {
        const pm = (await pmRes.json()) as { paymentMethods?: PaymentMethod[] };
        setPaymentMethods(pm.paymentMethods ?? []);
      } else {
        setPaymentMethods([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, [externalUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("topup");
    if (!value) return;
    if (value === "succeeded") setFlash("Top-up succeeded. Balance will update shortly.");
    else if (value === "canceled") setFlash("Checkout canceled.");
    else if (value === "pm-saved") {
      setFlash("Payment method saved.");
      void fetch("/api/pymthouse/wallet/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalUserId, ensureDefault: true }),
      }).finally(() => void load());
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("topup");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [externalUserId, load]);

  async function onTopUp() {
    const parsed = parseTopUpAmountUsd(amountInput);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy("topup");
    setError(null);
    try {
      const res = await fetch("/api/pymthouse/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalUserId, amountUsd: parsed.amount }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Top-up failed");
      if (!data.url) throw new Error("No checkout URL returned");
      redirectToCheckout(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
      setBusy(null);
    }
  }

  async function onTestUsage() {
    const parsed = parseTopUpAmountUsd(amountInput);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy("test-usage");
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/pymthouse/wallet/test-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalUserId,
          amountUsd: parsed.amount,
          collect: true,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        requestId?: string;
        amountUsd?: string;
        collect?: { outcome?: string; invoiceIds?: string[] };
      };
      if (!res.ok) throw new Error(data.error || "Test usage failed");
      const invoiceIds = data.collect?.invoiceIds ?? [];
      const outcome = data.collect?.outcome ?? "skipped";
      const fallback = parsed.amount.toFixed(2);
      setFlash(
        invoiceIds.length > 0
          ? `Test usage $${data.amountUsd ?? fallback} ingested (${data.requestId}). Invoice ${outcome}: ${invoiceIds.join(", ")}`
          : `Test usage $${data.amountUsd ?? fallback} ingested (${data.requestId}). Collect outcome: ${outcome}`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test usage failed");
    } finally {
      setBusy(null);
    }
  }

  async function onAddCard() {
    setBusy("pm");
    setError(null);
    try {
      const res = await fetch("/api/pymthouse/wallet/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalUserId }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Payment method setup failed");
      if (!data.checkoutUrl) throw new Error("No checkout URL returned");
      redirectToCheckout(data.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment method setup failed");
      setBusy(null);
    }
  }

  async function openInvoice(invoice: Invoice) {
    if (invoice.invoiceType === "auto_topup") return;
    setBusy(invoice.id);
    setError(null);
    try {
      const qs = `externalUserId=${encodeURIComponent(externalUserId)}`;
      const res = await fetch(
        `/api/pymthouse/wallet/invoices/${encodeURIComponent(invoice.id)}/hosted-url?${qs}`,
      );
      const data = (await res.json()) as {
        hostedInvoiceUrl?: string | null;
        invoicePdf?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not open invoice");
      const url = data.hostedInvoiceUrl || data.invoicePdf;
      if (!url) throw new Error("No hosted invoice URL");
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error("Invalid invoice URL");
      }
      const allowed =
        parsed.protocol === "https:" &&
        (parsed.hostname === "invoice.stripe.com" ||
          parsed.hostname.endsWith(".stripe.com") ||
          parsed.hostname === "pay.stripe.com");
      if (!allowed) throw new Error("Invoice URL host is not allowed");
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open invoice");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border border-border bg-surface p-5">
        <div className="h-4 w-32 rounded bg-elevated" />
        <div className="mt-4 h-16 rounded bg-elevated" />
      </div>
    );
  }

  const posture = billingState ? spendPostureBadge(billingState.status) : null;
  const runway = billingState ? availableRunway(billingState) : null;
  const defaultPm =
    paymentMethods.find((pm) => pm.isDefault) ?? paymentMethods[0] ?? null;
  const parsedAmount = parseTopUpAmountUsd(amountInput);
  const amountLabel = parsedAmount.ok
    ? formatTopUpUsdLabel(parsedAmount.amount)
    : amountInput.trim() || "…";
  const amountInvalid = amountInput.trim() !== "" && !parsedAmount.ok;
  const amountDisabled =
    busy === "topup" || busy === "test-usage" || !parsedAmount.ok;

  return (
    <div className="space-y-6">
      {flash ? (
        <p className="rounded-md border border-live/30 bg-live-dim/30 px-3 py-2 text-sm text-live">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-billing-block">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-5">
        {billingState && posture && runway ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${POSTURE_CLASS[posture.tone]}`}
              >
                {posture.label}
              </span>
              <p className="text-sm font-semibold text-fg">{billingState.explain.headline}</p>
            </div>
            <p className="mt-1 text-sm text-muted">{billingState.explain.detail}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  Available
                </p>
                <p
                  className={`mt-1 font-mono text-3xl tabular-nums ${RUNWAY_CLASS[runway.tone]}`}
                >
                  {runway.usd}
                </p>
                {runway.detail ? (
                  <p className="mt-1 text-xs text-muted">{runway.detail}</p>
                ) : null}
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  Lifetime granted
                </p>
                <p className="mt-1 font-mono text-3xl tabular-nums text-fg">
                  ${formatWalletUsd(balance?.lifetimeGrantedUsdMicros)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Consumed ${formatWalletUsd(balance?.consumedUsdMicros)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Billing state unavailable.</p>
        )}

        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-end gap-2">
            {QUICK_AMOUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAmountInput(String(n))}
                className={`rounded-md border px-3 py-1.5 font-mono text-xs tabular-nums ${
                  parsedAmount.ok && parsedAmount.amount === n
                    ? "border-live bg-live-dim text-live"
                    : "border-border text-muted hover:border-border-strong hover:text-fg"
                }`}
              >
                ${n}
              </button>
            ))}
            <label htmlFor="topup-amount" className="relative inline-flex items-center">
              <span className="sr-only">Custom amount in dollars</span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 font-mono text-xs text-muted"
              >
                $
              </span>
              <input
                id="topup-amount"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="1.00"
                aria-invalid={amountInvalid}
                aria-describedby="topup-amount-hint"
                value={amountInput}
                onChange={(e) =>
                  setAmountInput(sanitizeTopUpAmountInput(e.target.value))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onTopUp();
                  }
                }}
                className={`h-7.5 w-28 rounded-md border bg-elevated py-1.5 pl-6 pr-2 font-mono text-xs tabular-nums text-fg outline-none placeholder:text-faint focus-visible:ring-1 focus-visible:ring-live/30 ${
                  amountInvalid
                    ? "border-billing-block"
                    : parsedAmount.ok &&
                        !QUICK_AMOUNTS.some((n) => n === parsedAmount.amount)
                      ? "border-live bg-live-dim text-live"
                      : "border-border"
                }`}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void onTopUp()}
              disabled={amountDisabled}
            >
              {busy === "topup" ? "Starting…" : `Add $${amountLabel} credit`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onTestUsage()}
              disabled={amountDisabled}
            >
              {busy === "test-usage"
                ? "Sending usage…"
                : `Test usage $${amountLabel}`}
            </Button>
          </div>
        </div>
        <p
          id="topup-amount-hint"
          className={`mt-2 text-xs ${amountInvalid ? "text-billing-block" : "text-faint"}`}
        >
          {amountInvalid
            ? `Enter $${TOP_UP_MIN_USD}–$${TOP_UP_MAX_USD.toLocaleString()} (up to 2 decimals).`
            : `Min $${TOP_UP_MIN_USD} · max $${TOP_UP_MAX_USD.toLocaleString()}. Test usage posts a CloudEvent into OpenMeter (same meter as Kafka ingest), then forces collection so you can follow Custom Invoicing → settlement → Stripe Connect.`}
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg">Payment method</h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onAddCard()}
            disabled={busy === "pm"}
            className="!py-1.5 text-xs"
          >
            {busy === "pm" ? "Starting…" : "Add card"}
          </Button>
        </div>
        {defaultPm ? (
          <p className="mt-2 font-mono text-sm text-muted">
            {(defaultPm.brand || "card").toUpperCase()} ···· {defaultPm.last4}
            {defaultPm.isDefault ? " · default" : ""}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">No card on file.</p>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold text-fg">Billing history</h3>
        <p className="mt-1 text-xs text-faint">
          Metered usage is activity; paid invoices settle the bill. Credits show
          prepaid add/drawdown.
        </p>
        {ledger.length === 0 && invoices.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No billing activity yet.</p>
        ) : ledger.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {ledger.slice(0, 20).map((entry) => {
              const amountUsd = Number(BigInt(entry.amountUsdMicros || "0")) / 1_000_000;
              const delta = Number(BigInt(entry.creditDeltaUsdMicros || "0")) / 1_000_000;
              const label =
                entry.type === "credit_purchased"
                  ? "Credit"
                  : entry.type === "usage"
                    ? "Usage"
                    : entry.type === "refund"
                      ? "Refund"
                      : "Invoice";
              // Usage amount is gross metered spend — not an open receivable.
              // Prepaid burn is shown separately when credits were drawn down.
              const signed =
                entry.type === "usage"
                  ? `$${amountUsd.toFixed(2)}`
                  : delta < 0
                    ? `-$${Math.abs(amountUsd).toFixed(2)}`
                    : `$${amountUsd.toFixed(2)}`;
              const prepaidNote =
                entry.type === "usage" && delta < 0
                  ? ` · −$${Math.abs(delta).toFixed(2)} prepaid`
                  : "";
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-fg">{entry.description}</p>
                    <p className="text-xs text-faint">
                      {formatInvoiceDate(entry.date)} · {label}
                      {entry.derived ? " · metered" : ""}
                      {prepaidNote}
                    </p>
                  </div>
                  <span
                    className={`font-mono tabular-nums ${
                      entry.type === "usage" || delta < 0
                        ? "text-muted"
                        : "text-fg"
                    }`}
                  >
                    {signed}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-fg">
                    {inv.number ?? inv.id}
                  </p>
                  <p className="text-xs text-faint">
                    {formatInvoiceDate(inv.issuedAt ?? inv.periodEnd)} ·{" "}
                    {inv.invoiceType === "auto_topup" ? "top-up" : inv.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-fg">
                    {formatInvoiceAmount(inv.totalAmount, inv.currency)}
                  </span>
                  {inv.invoiceType !== "auto_topup" ? (
                    <button
                      type="button"
                      onClick={() => void openInvoice(inv)}
                      disabled={busy === inv.id}
                      className="text-xs text-cool hover:underline disabled:opacity-50"
                    >
                      {busy === inv.id ? "…" : "View"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => void load()}
        className="text-xs text-faint hover:text-muted"
      >
        Refresh billing
      </button>
    </div>
  );
}
