export const TOP_UP_MIN_USD = 1;
export const TOP_UP_MAX_USD = 10_000;
export const DEFAULT_TOP_UP_USD = 10;

const AMOUNT_PATTERN = /^(\d{1,5})(?:\.(\d{1,2}))?$/;

export function parseTopUpAmountUsd(
  value: unknown,
): { ok: true; amount: number } | { ok: false; error: string } {
  let raw: string;
  if (typeof value === "number" && Number.isFinite(value)) {
    raw = String(value);
  } else if (typeof value === "string") {
    raw = value.trim();
  } else {
    return { ok: false, error: "amountUsd must be 1–10000" };
  }
  if (!AMOUNT_PATTERN.test(raw)) {
    return {
      ok: false,
      error: "amountUsd must be a dollar amount with up to 2 decimals",
    };
  }
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < TOP_UP_MIN_USD || amount > TOP_UP_MAX_USD) {
    return { ok: false, error: "amountUsd must be 1–10000" };
  }
  return { ok: true, amount };
}

export function formatTopUpUsdLabel(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function sanitizeTopUpAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned.slice(0, 5);
  const whole = cleaned.slice(0, dot).slice(0, 5);
  const frac = cleaned
    .slice(dot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${whole}.${frac}`;
}
