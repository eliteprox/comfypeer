"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PlansPanel } from "@/components/PlansPanel";
import { redirectToCheckout } from "@/lib/checkout-redirect";
import {
  includedUsageRemainingLabel,
  includedUsageSummary,
  type IncludedUsageSummary,
} from "@/lib/included-usage";
import {
  DEFAULT_TOP_UP_USD,
  formatTopUpUsdLabel,
  parseTopUpAmountUsd,
  sanitizeTopUpAmountInput,
  TOP_UP_MAX_USD,
  TOP_UP_MIN_USD,
} from "@/lib/top-up-amount";

type CreditBalance = {
  customerId: string;
  currency: string;
  live: string;
  pending: string;
  settled: string;
  retrievedAt: string | null;
};

type AutoTopUp = {
  enabled: boolean;
  amountUsd: string | null;
};

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

type PaymentMethod = {
  id: string;
  brand: string | null;
  last4: string | null;
  isDefault: boolean;
};

const QUICK_AMOUNTS = [1, 10, 25, 100] as const;
const AUTO_TOP_UP_AMOUNTS = [10, 25, 50, 100] as const;
const DEFAULT_AUTO_TOP_UP_AMOUNT = String(DEFAULT_TOP_UP_USD);

function normalizedAutoTopUpAmount(raw: string | null | undefined): string {
  const parsed = parseTopUpAmountUsd(raw ?? "");
  return parsed.ok ? formatTopUpUsdLabel(parsed.amount) : DEFAULT_AUTO_TOP_UP_AMOUNT;
}

function AmountQuickPick({
  inputId,
  label,
  placeholder,
  amounts,
  value,
  parsed,
  disabled,
  invalid,
  describedBy,
  onChange,
  onCommit,
  onEnter,
}: {
  inputId: string;
  label: string;
  placeholder: string;
  amounts: readonly number[];
  value: string;
  parsed: ReturnType<typeof parseTopUpAmountUsd>;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  onEnter?: () => void;
}) {
  const selected = parsed.ok ? parsed.amount : null;
  return (
    <div className="flex flex-wrap items-end gap-2">
      {amounts.map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => {
            const next = String(n);
            onChange(next);
            onCommit?.(next);
          }}
          className={`rounded-md border px-3 py-1.5 font-mono text-xs tabular-nums ${
            selected === n
              ? "border-live bg-live-dim text-live"
              : "border-border text-muted hover:border-border-strong hover:text-fg"
          }`}
        >
          ${n}
        </button>
      ))}
      <label htmlFor={inputId} className="relative inline-flex items-center">
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 font-mono text-xs text-muted"
        >
          $
        </span>
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(sanitizeTopUpAmountInput(e.target.value))}
          onBlur={() => {
            if (parsed.ok) onCommit?.(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={`h-7.5 w-28 rounded-md border bg-elevated py-1.5 pl-6 pr-2 font-mono text-xs tabular-nums text-fg outline-none placeholder:text-faint focus-visible:ring-1 focus-visible:ring-live/30 ${
            invalid
              ? "border-billing-block"
              : parsed.ok && !amounts.some((n) => n === parsed.amount)
                ? "border-live bg-live-dim text-live"
                : "border-border"
          }`}
        />
      </label>
    </div>
  );
}

function formatCreditUsd(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase() || "USD",
  }).format(n);
}

function formatInvoiceDate(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isVisibleBillingHistoryItem(item: { invoiceType?: string; totalAmount: string }): boolean {
  const type = (item.invoiceType ?? "").trim().toLowerCase();
  if (type === "pending_usage") {
    return true;
  }
  const amount = Number(item.totalAmount);
  return Number.isFinite(amount) && amount !== 0;
}

function billingHistoryKind(invoiceType: string | undefined): string {
  const type = (invoiceType ?? "").trim().toLowerCase();
  if (type === "pending_usage") return "Unbilled usage";
  if (type === "auto_topup" || type === "payment") return "Payment";
  return "Invoice";
}

function formatInvoiceAmount(totalAmount: string, currency: string): string {
  const n = Number(totalAmount);
  if (!Number.isFinite(n)) return totalAmount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency?.toUpperCase() || "USD",
  }).format(n);
}

export function BillingPanel({ externalUserId }: { externalUserId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [included, setIncluded] = useState<IncludedUsageSummary | null>(null);
  const [autoTopUp, setAutoTopUp] = useState<AutoTopUp | null>(null);
  const [autoTopUpAmount, setAutoTopUpAmount] = useState(DEFAULT_AUTO_TOP_UP_AMOUNT);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [amountInput, setAmountInput] = useState(String(DEFAULT_TOP_UP_USD));
  const [busy, setBusy] = useState<"topup" | "pm" | "test-usage" | "autotopup" | string | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = `externalUserId=${encodeURIComponent(externalUserId)}`;
    try {
      const [walletRes, invRes, pmRes] = await Promise.all([
        fetch(`/api/pymthouse/wallet?${qs}`),
        fetch(`/api/pymthouse/wallet/invoices?${qs}&pageSize=20`),
        fetch(`/api/pymthouse/wallet/payment-methods?${qs}`),
      ]);
      if (!walletRes.ok) {
        const body = (await walletRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load billing");
      }
      const wallet = (await walletRes.json()) as {
        credits: CreditBalance;
        autoTopUp?: AutoTopUp | null;
        billingState?: unknown;
      };
      setCredits(wallet.credits);
      setIncluded(includedUsageSummary(wallet.billingState));
      const prefs = wallet.autoTopUp ?? null;
      setAutoTopUp(prefs);
      setAutoTopUpAmount(normalizedAutoTopUpAmount(prefs?.amountUsd));

      if (invRes.ok) {
        const inv = (await invRes.json()) as { items?: Invoice[] };
        setInvoices(inv.items ?? []);
      } else {
        setInvoices([]);
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
      const outcome = data.collect?.outcome;
      const fallback = parsed.amount.toFixed(2);
      const ingested = `Test usage $${data.amountUsd ?? fallback} ingested (${data.requestId})`;
      setFlash(
        invoiceIds.length > 0
          ? `${ingested}. Invoice ${outcome}: ${invoiceIds.join(", ")}`
          : outcome
            ? `${ingested}. Collect outcome: ${outcome}`
            : `${ingested}. Invoice collection is automatic and may take a few minutes.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test usage failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveAutoTopUp(enabled: boolean, amountInput: string) {
    const parsed = parseTopUpAmountUsd(amountInput);
    let amount: number;
    if (parsed.ok) {
      amount = parsed.amount;
    } else if (!enabled) {
      const fallback = parseTopUpAmountUsd(autoTopUp?.amountUsd ?? DEFAULT_AUTO_TOP_UP_AMOUNT);
      amount = fallback.ok ? fallback.amount : DEFAULT_TOP_UP_USD;
    } else {
      setError(parsed.error);
      return;
    }
    setBusy("autotopup");
    setError(null);
    try {
      const res = await fetch("/api/pymthouse/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalUserId,
          enabled,
          amountUsd: amount,
        }),
      });
      const data = (await res.json()) as {
        autoTopUp?: AutoTopUp;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not save auto top-up");
      const prefs = data.autoTopUp ?? { enabled, amountUsd: amount.toFixed(2) };
      setAutoTopUp(prefs);
      setAutoTopUpAmount(normalizedAutoTopUpAmount(prefs.amountUsd));
      setFlash(
        prefs.enabled
          ? `Auto top-up on — adds $${prefs.amountUsd ?? amount} when credit hits $0.`
          : "Auto top-up off.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save auto top-up");
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
    if (invoice.invoiceType === "auto_topup" || invoice.invoiceType === "pending_usage") {
      return;
    }
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

  const currency = credits?.currency ?? "USD";
  const liveNum = credits ? Number(credits.live) : 0;
  const pendingNum = credits ? Number(credits.pending) : 0;
  const hasCredit = Number.isFinite(liveNum) && liveNum > 0;
  const hasPendingGrants = Number.isFinite(pendingNum) && pendingNum > 0;
  const defaultPm = paymentMethods.find((pm) => pm.isDefault) ?? paymentMethods[0] ?? null;
  const parsedAmount = parseTopUpAmountUsd(amountInput);
  const parsedAutoTopUpAmount = parseTopUpAmountUsd(autoTopUpAmount);
  const amountLabel = parsedAmount.ok
    ? formatTopUpUsdLabel(parsedAmount.amount)
    : amountInput.trim() || "…";
  const amountInvalid = amountInput.trim() !== "" && !parsedAmount.ok;
  const autoTopUpAmountInvalid = Boolean(autoTopUp?.enabled && !parsedAutoTopUpAmount.ok);
  const amountDisabled = busy === "topup" || busy === "test-usage" || !parsedAmount.ok;
  const autoTopUpKnown = autoTopUp !== null;
  const autoTopUpBusy = busy === "autotopup" || !autoTopUpKnown;
  const stripeHistory = invoices.filter(isVisibleBillingHistoryItem);

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

      <PlansPanel externalUserId={externalUserId} included={included} />

      <section className="rounded-lg border border-border bg-surface p-5">
        {credits ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  hasCredit
                    ? "border-live/40 text-live"
                    : "border-billing-warn/40 text-billing-warn"
                }`}
              >
                {hasCredit ? "Credits available" : "No spendable credit"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              Spendable credit after open charges. Balances are {currency} and are not merged across
              currencies.
            </p>

            <div className="mt-5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-faint">Live</p>
              <p
                className={`mt-1 font-mono text-3xl tabular-nums ${
                  hasCredit ? "text-fg" : "text-billing-warn"
                }`}
              >
                {formatCreditUsd(credits.live, currency)}
              </p>
              <p className="mt-1 text-xs text-muted">Prepaid credits</p>
            </div>
            {included ? (
              <div className="mt-5">
                <p className="font-mono text-[10px] uppercase tracking-wide text-faint">
                  {included.planName ?? "Included usage"}
                </p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-fg">
                  ${included.remainingUsd}
                  <span className="text-base text-muted"> / ${included.totalUsd}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {includedUsageRemainingLabel(included)}
                  {included.resetsAt
                    ? ` · resets ${new Date(included.resetsAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}`
                    : ""}
                </p>
              </div>
            ) : null}
            {hasPendingGrants ? (
              <p className="mt-3 font-mono text-xs text-faint">
                Pending grants {formatCreditUsd(credits.pending, currency)} (not spendable yet)
                {credits.retrievedAt ? ` · ${new Date(credits.retrievedAt).toLocaleString()}` : ""}
              </p>
            ) : credits.retrievedAt ? (
              <p className="mt-3 font-mono text-xs text-faint">
                {new Date(credits.retrievedAt).toLocaleString()}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">Credit balance unavailable.</p>
        )}

        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <AmountQuickPick
            inputId="topup-amount"
            label="Custom amount in dollars"
            placeholder="1.00"
            amounts={QUICK_AMOUNTS}
            value={amountInput}
            parsed={parsedAmount}
            invalid={amountInvalid}
            describedBy="topup-amount-hint"
            onChange={setAmountInput}
            onEnter={() => void onTopUp()}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void onTopUp()} disabled={amountDisabled}>
              {busy === "topup" ? "Starting…" : `Add $${amountLabel} credit`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onTestUsage()}
              disabled={amountDisabled}
            >
              {busy === "test-usage" ? "Sending usage…" : `Test usage $${amountLabel}`}
            </Button>
          </div>
        </div>
        <p
          id="topup-amount-hint"
          className={`mt-2 text-xs ${amountInvalid ? "text-billing-block" : "text-faint"}`}
        >
          {amountInvalid
            ? `Enter $${TOP_UP_MIN_USD}–$${TOP_UP_MAX_USD.toLocaleString()} (up to 2 decimals).`
            : `Min $${TOP_UP_MIN_USD} · max $${TOP_UP_MAX_USD.toLocaleString()}. Test usage posts a CloudEvent into OpenMeter (same meter as Kafka ingest). Collection follows the automatic invoice path — usually a minute or few, not instant.`}
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

      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-base font-semibold text-fg">Auto top-up</h3>
        <p className="mt-1 text-sm text-muted">
          When live credit hits $0, charge your saved card and add credit so generation can
          continue.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={autoTopUp?.enabled ?? false}
            disabled={autoTopUpBusy || (!defaultPm && !autoTopUp?.enabled)}
            onChange={(e) => {
              const next = e.target.checked;
              if (next && !defaultPm) {
                setError("Add a card before enabling auto top-up.");
                return;
              }
              void onSaveAutoTopUp(next, autoTopUpAmount);
            }}
          />
          Enable auto top-up
        </label>
        <div className="mt-3">
          <AmountQuickPick
            inputId="autotopup-amount"
            label="Auto top-up amount in dollars"
            placeholder="10.00"
            amounts={AUTO_TOP_UP_AMOUNTS}
            value={autoTopUpAmount}
            parsed={parsedAutoTopUpAmount}
            disabled={autoTopUpBusy}
            invalid={autoTopUpAmountInvalid}
            describedBy="autotopup-amount-hint"
            onChange={setAutoTopUpAmount}
            onCommit={
              autoTopUp?.enabled && defaultPm
                ? (next) => void onSaveAutoTopUp(true, next)
                : undefined
            }
          />
        </div>
        <p
          id="autotopup-amount-hint"
          className={`mt-2 text-xs ${autoTopUpAmountInvalid ? "text-billing-block" : "text-faint"}`}
        >
          {!autoTopUpKnown
            ? "Auto top-up settings unavailable. Refresh billing to try again."
            : autoTopUp?.enabled && !parsedAutoTopUpAmount.ok
              ? parsedAutoTopUpAmount.error
              : defaultPm
                ? `Reloads $${parsedAutoTopUpAmount.ok ? formatTopUpUsdLabel(parsedAutoTopUpAmount.amount) : "…"} when spendable credit is empty. Min $${TOP_UP_MIN_USD} · max $${TOP_UP_MAX_USD.toLocaleString()}.`
                : "Add a card to enable auto top-up."}
        </p>
      </section>

      <section>
        <h3 className="text-base font-semibold text-fg">Billing history</h3>
        <p className="mt-1 text-xs text-faint">Stripe invoices and payments for this user.</p>
        {stripeHistory.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {stripeHistory.slice(0, 20).map((inv) => {
              const kind = billingHistoryKind(inv.invoiceType);
              return (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-fg">{inv.number ?? inv.id}</p>
                    <p className="text-xs text-faint">
                      {formatInvoiceDate(inv.issuedAt ?? inv.periodEnd)} · {kind}
                      {inv.status ? ` · ${inv.status}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-fg">
                      {formatInvoiceAmount(inv.totalAmount, inv.currency)}
                    </span>
                    {inv.invoiceType === "stripe_connect" || inv.invoiceType === undefined ? (
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
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No billing activity yet.</p>
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
