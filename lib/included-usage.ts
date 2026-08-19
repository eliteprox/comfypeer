/**
 * Remaining included-usage discount from a wallet billingState payload.
 * builder-sdk 0.6.x types omit `includedUsage`; read it at runtime.
 */

type Money = {
  usdMicros?: string;
  usd?: string;
};

export type IncludedUsageSummary = {
  remainingUsdMicros: string;
  totalUsdMicros: string;
  consumedUsdMicros: string;
  remainingUsd: string;
  totalUsd: string;
  consumedUsd: string;
  planId: string | null;
  planName: string | null;
  resetsAt: string | null;
};

function parseUsdMicros(raw: string | null | undefined): bigint {
  const trimmed = raw?.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return BigInt(0);
  try {
    return BigInt(trimmed);
  } catch {
    return BigInt(0);
  }
}

function formatUsd(micros: string): string {
  return (Number(parseUsdMicros(micros)) / 1_000_000).toFixed(2);
}

export function includedUsageSummary(
  billingState: unknown,
): IncludedUsageSummary | null {
  if (!billingState || typeof billingState !== "object") return null;
  const funding = (billingState as { funding?: unknown }).funding;
  if (!funding || typeof funding !== "object") return null;

  const includedUsage = (funding as { includedUsage?: unknown }).includedUsage;
  const included = (funding as { included?: Money }).included;
  const usage =
    includedUsage && typeof includedUsage === "object"
      ? (includedUsage as {
          total?: Money;
          remaining?: Money;
          consumed?: Money;
          resetsAt?: string;
          sourcePlan?: { id?: string | null; name?: string | null } | null;
        })
      : null;

  const remainingUsdMicros =
    usage?.remaining?.usdMicros ?? included?.usdMicros ?? "0";
  const totalUsdMicros = usage?.total?.usdMicros ?? remainingUsdMicros;
  const consumedUsdMicros = usage?.consumed?.usdMicros ?? "0";
  if (parseUsdMicros(totalUsdMicros) <= BigInt(0)) return null;

  const planName = usage?.sourcePlan?.name?.trim() || null;
  const planId = usage?.sourcePlan?.id?.trim() || null;
  const resetsAt = usage?.resetsAt?.trim() || null;

  return {
    remainingUsdMicros,
    totalUsdMicros,
    consumedUsdMicros,
    remainingUsd: formatUsd(remainingUsdMicros),
    totalUsd: formatUsd(totalUsdMicros),
    consumedUsd: formatUsd(consumedUsdMicros),
    planId,
    planName,
    resetsAt,
  };
}

export function includedUsageRemainingLabel(summary: IncludedUsageSummary): string {
  const plan = summary.planName ?? "Plan";
  return `${plan} · $${summary.remainingUsd} of $${summary.totalUsd} included left`;
}
