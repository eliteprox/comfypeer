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

/**
 * Signed runway for the Available figure.
 *
 * While prepaid/included remain, runway is spendable — gathering invoice
 * totals can still list prepaid-covered usage under credit_then_invoice and
 * must not be subtracted again. Once spendable is exhausted, runway is the
 * negative of unbilled overage debt.
 */
export function availableRunway(state: BillingState): {
  usd: string;
  tone: SpendPostureTone;
  detail: string | null;
} {
  const included = parseUsdMicros(state.funding.included.usdMicros);
  const prepaid = parseUsdMicros(state.funding.prepaid.usdMicros);
  const spendable = parseUsdMicros(state.funding.spendable.usdMicros);
  const debt = parseUsdMicros(state.funding.overage.unbilledDebt?.usdMicros);
  const available = spendable > BigInt(0) ? spendable : -debt;

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
};

function absMicros(value: bigint): bigint {
  return value < BigInt(0) ? -value : value;
}

/**
 * Prepaid drawdowns plus collected invoices — what was billed this cycle,
 * not gross meter (which still includes plan-included usage).
 */
export function sumLedgerBilledUsageUsdMicros(
  entries: ReadonlyArray<LedgerAmountRow>,
): bigint {
  let total = BigInt(0);
  for (const entry of entries) {
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

export function formatInvoiceAmount(totalAmount: string, currency: string): string {
  const n = Number(totalAmount);
  if (!Number.isFinite(n)) return totalAmount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency?.toUpperCase() || "USD",
  }).format(n);
}
