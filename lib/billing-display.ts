import type { BillingState, BillingStatus } from "@pymthouse/builder-sdk";

export function microsToUsd(micros: string | null | undefined): number {
  const trimmed = micros?.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return 0;
  try {
    return Number(BigInt(trimmed)) / 1_000_000;
  } catch {
    return 0;
  }
}

export function formatWalletUsd(micros: string | null | undefined): string {
  return microsToUsd(micros).toFixed(2);
}

function parseUsdMicros(raw: string | null | undefined): bigint {
  const trimmed = raw?.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return BigInt(0);
  try {
    return BigInt(trimmed);
  } catch {
    return BigInt(0);
  }
}

export function formatSignedWalletUsd(micros: bigint): string {
  const negative = micros < BigInt(0);
  const abs = negative ? -micros : micros;
  const formatted = (Number(abs) / 1_000_000).toFixed(2);
  return negative ? `-$${formatted}` : `$${formatted}`;
}

export type SpendPostureTone = "ok" | "info" | "warn" | "danger";

export function spendPostureBadge(status: BillingStatus): {
  label: string;
  tone: SpendPostureTone;
} {
  switch (status) {
    case "active":
      return { label: "Credits", tone: "ok" };
    case "overage":
      return { label: "Pay as you go", tone: "info" };
    case "at_risk":
      return { label: "Collecting payment", tone: "warn" };
    case "blocked":
      return { label: "Paused", tone: "danger" };
  }
}

type BillingStateFunding = BillingState["funding"] & {
  /** Signed spendable − deduped debt. Present on current PymtHouse. */
  net?: { usdMicros?: string };
};

/**
 * Signed runway for the Available figure.
 *
 * Prefer PymtHouse `funding.net` (already nets prepaid/included and
 * already-paid invoices). Do not re-subtract unbilledDebt on top of that —
 * that is what made a red balance look like the whole cycle was still owed.
 */
export function availableRunway(state: BillingState): {
  usd: string;
  tone: SpendPostureTone;
  detail: string | null;
} {
  const funding = state.funding as BillingStateFunding;
  const included = parseUsdMicros(funding.included.usdMicros);
  const prepaid = parseUsdMicros(funding.prepaid.usdMicros);
  const spendable = parseUsdMicros(funding.spendable.usdMicros);
  const debt = parseUsdMicros(funding.overage.unbilledDebt?.usdMicros);
  const available =
    funding.net?.usdMicros != null
      ? parseUsdMicros(funding.net.usdMicros)
      : spendable > BigInt(0)
        ? spendable
        : -debt;

  let tone: SpendPostureTone = "ok";
  if (available < BigInt(0)) {
    if (state.status === "blocked") tone = "danger";
    else if (state.status === "at_risk") tone = "warn";
    else tone = "info";
  }

  let detail: string | null = null;
  if (available < BigInt(0)) {
    detail = `Unbilled $${formatWalletUsd(debt.toString())}`;
  } else {
    const parts: string[] = [];
    if (included > BigInt(0)) parts.push(`Included $${formatWalletUsd(included.toString())}`);
    if (prepaid > BigInt(0)) parts.push(`Credits $${formatWalletUsd(prepaid.toString())}`);
    detail = parts.length > 0 ? parts.join(" · ") : null;
  }

  return {
    usd: formatSignedWalletUsd(available),
    tone,
    detail,
  };
}

/** UTC calendar month label — same window as PymtHouse wallet usage. */
export function currentBillingPeriodLabel(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type LedgerAmountRow = {
  type: string;
  amountUsdMicros: string;
  creditDeltaUsdMicros: string;
  status?: string | null;
};

function absMicros(value: bigint): bigint {
  return value < BigInt(0) ? -value : value;
}

/** Synthetic PymtHouse row for accrued usage that is not a collected invoice. */
export function isPendingUsageRow(entry: LedgerAmountRow): boolean {
  return (
    entry.type === "invoice" &&
    (entry.status ?? "").trim().toLowerCase() === "pending"
  );
}

/**
 * Prepaid drawdowns plus collected invoices — what was billed this cycle.
 * Pending / not-yet-invoiced rows are the same cycle meter PymtHouse already
 * used for unbilled debt; counting them here double-counts paid usage.
 */
export function sumLedgerBilledUsageUsdMicros(
  entries: ReadonlyArray<LedgerAmountRow>,
): bigint {
  let total = BigInt(0);
  for (const entry of entries) {
    if (isPendingUsageRow(entry)) continue;
    if (entry.type === "usage") {
      total += absMicros(parseUsdMicros(entry.creditDeltaUsdMicros));
    } else if (entry.type === "invoice") {
      total += parseUsdMicros(entry.amountUsdMicros);
    }
  }
  return total;
}

/** Credit purchases, prepaid burns, and non-zero invoices/refunds. */
export function isBillingHistoryRow(entry: LedgerAmountRow): boolean {
  if (entry.type === "credit_purchased") {
    return parseUsdMicros(entry.amountUsdMicros) !== BigInt(0);
  }
  if (entry.type === "usage") {
    return parseUsdMicros(entry.creditDeltaUsdMicros) !== BigInt(0);
  }
  if (entry.type === "invoice" || entry.type === "refund") {
    return parseUsdMicros(entry.amountUsdMicros) !== BigInt(0);
  }
  return false;
}

/** Signed amount for the history column: wallet delta, or invoice/refund total. */
export function ledgerHistorySignedUsdMicros(entry: LedgerAmountRow): bigint {
  if (entry.type === "usage" || entry.type === "credit_purchased") {
    return parseUsdMicros(entry.creditDeltaUsdMicros);
  }
  if (entry.type === "refund") {
    return -parseUsdMicros(entry.amountUsdMicros);
  }
  return parseUsdMicros(entry.amountUsdMicros);
}

export function formatInvoiceDate(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Stripe Connect charges/invoices — not the synthetic pending-usage estimate. */
export function isCollectedStripeHistoryItem(item: {
  invoiceType?: string;
  totalAmount: string;
}): boolean {
  if ((item.invoiceType ?? "").trim().toLowerCase() === "pending_usage") {
    return false;
  }
  const amount = Number(item.totalAmount);
  return Number.isFinite(amount) && amount !== 0;
}

export function formatInvoiceAmount(totalAmount: string, currency: string): string {
  const n = Number(totalAmount);
  if (!Number.isFinite(n)) return totalAmount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency?.toUpperCase() || "USD",
  }).format(n);
}
