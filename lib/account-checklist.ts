export type AccountChecklistItem = {
  id: "account" | "credit" | "first-stream" | "auto-topup";
  label: string;
  done: boolean;
};

export type AccountChecklistInput = {
  userPresent: boolean;
  spendableUsd: number | null;
  requestCount: number | null;
  autoTopUp: boolean | null;
};

export type AccountChecklist = {
  collapsed: boolean;
  items: AccountChecklistItem[];
};

/**
 * Derived account checklist. Install and Desktop sign-in are instructions,
 * not boxes — this function does not emit them.
 * A first stream (requestCount > 0) collapses the list in the UI.
 */
export function accountChecklist(input: AccountChecklistInput): AccountChecklist {
  const firstStream = input.requestCount != null && input.requestCount > 0;
  return {
    collapsed: firstStream,
    items: [
      { id: "account", label: "Account created", done: input.userPresent },
      {
        id: "credit",
        label: "Credit available",
        done: input.spendableUsd != null && input.spendableUsd > 0,
      },
      { id: "first-stream", label: "First stream", done: firstStream },
      { id: "auto-topup", label: "Auto top-up", done: input.autoTopUp === true },
    ],
  };
}

/**
 * Minutes of runway at a measured per-second rate.
 * Returns null when spendable or the rate is missing — callers skip the sentence.
 */
export function creditRunwayMinutes(
  spendableUsd: number,
  rateUsdPerSec: number | null,
): number | null {
  if (rateUsdPerSec == null || !(rateUsdPerSec > 0) || !(spendableUsd > 0)) return null;
  return spendableUsd / rateUsdPerSec / 60;
}
