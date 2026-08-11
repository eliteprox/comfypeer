import "server-only";

import {
  PmtHouseClient,
  PmtHouseError,
  type AppUserInvoice,
  type AppUserInvoiceHostedUrlResult,
  type AppUserPaymentMethod,
  type BillingState,
  type UsageBalanceResponse,
} from "@pymthouse/builder-sdk";

function readPymthouseM2mConfig() {
  const issuerUrl = process.env.PYMTHOUSE_ISSUER_URL?.trim();
  const m2mClientId = process.env.PYMTHOUSE_M2M_CLIENT_ID?.trim();
  const m2mClientSecret = process.env.PYMTHOUSE_M2M_CLIENT_SECRET?.trim();
  if (!issuerUrl || !m2mClientId || !m2mClientSecret) {
    return null;
  }
  return {
    issuerUrl,
    m2mClientId,
    m2mClientSecret,
    allowInsecureHttp: process.env.PYMTHOUSE_ALLOW_INSECURE_HTTP === "1",
  };
}

export function readPublicClientId(): string {
  const id = process.env.PYMTHOUSE_PUBLIC_CLIENT_ID?.trim();
  if (!id) {
    throw new PmtHouseError("PYMTHOUSE_PUBLIC_CLIENT_ID is required", {
      status: 503,
      code: "pymthouse_required",
    });
  }
  return id;
}

export function createPmtHouseClient(): PmtHouseClient {
  const config = readPymthouseM2mConfig();
  if (!config) {
    throw new PmtHouseError(
      "Pymthouse is not configured. Set PYMTHOUSE_ISSUER_URL, PYMTHOUSE_M2M_CLIENT_ID, and PYMTHOUSE_M2M_CLIENT_SECRET.",
      { status: 503, code: "pymthouse_required" },
    );
  }
  return new PmtHouseClient({
    issuerUrl: config.issuerUrl,
    publicClientId: readPublicClientId(),
    m2mClientId: config.m2mClientId,
    m2mClientSecret: config.m2mClientSecret,
    allowInsecureHttp: config.allowInsecureHttp,
  });
}

function appsOrigin(): string {
  const issuer = process.env.PYMTHOUSE_ISSUER_URL?.trim();
  if (!issuer) {
    throw new PmtHouseError("PYMTHOUSE_ISSUER_URL is required", {
      status: 503,
      code: "pymthouse_required",
    });
  }
  return issuer.replace(/\/api\/v1\/oidc\/?$/i, "");
}

function m2mAuthHeader(): string {
  const id = process.env.PYMTHOUSE_M2M_CLIENT_ID?.trim();
  const secret = process.env.PYMTHOUSE_M2M_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new PmtHouseError("M2M credentials required", {
      status: 503,
      code: "pymthouse_required",
    });
  }
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function isUserNotFoundError(error: unknown): boolean {
  if (!(error instanceof PmtHouseError)) return false;
  return (
    error.status === 404 ||
    error.code === "user_not_found" ||
    error.code === "not_found"
  );
}

export async function ensureAppUserProvisioned(
  externalUserId: string,
  email?: string,
): Promise<void> {
  const client = createPmtHouseClient();
  try {
    await client.upsertAppUser({
      externalUserId,
      ...(email?.trim() ? { email: email.trim() } : {}),
      status: "active",
    });
  } catch (error) {
    if (error instanceof PmtHouseError && error.status === 409) return;
    throw error;
  }
}

export async function createUserApiKey(externalUserId: string, label?: string) {
  await ensureAppUserProvisioned(externalUserId);
  // Key mint is not wrapped by builder-sdk yet — one M2M POST.
  const clientId = readPublicClientId();
  const response = await fetch(
    `${appsOrigin()}/api/v1/apps/${encodeURIComponent(clientId)}/users/${encodeURIComponent(externalUserId)}/keys`,
    {
      method: "POST",
      headers: {
        Authorization: m2mAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(label ? { label } : {}),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PmtHouseError(text || "API key create failed", {
      status: response.status,
      code: "api_key_create_failed",
    });
  }
  return (await response.json()) as {
    apiKey: string;
    sdkToken?: string;
    id: string;
  };
}

/** SDK: balance + billing posture for Settings / studio. */
export async function getBillingSnapshot(externalUserId: string): Promise<{
  balance: UsageBalanceResponse;
  billingState: BillingState;
}> {
  const client = createPmtHouseClient();
  await ensureAppUserProvisioned(externalUserId);
  const [balance, billingState] = await Promise.all([
    client.getUsageBalance(externalUserId),
    client.getBillingState(externalUserId),
  ]);
  return { balance, billingState };
}

/** SDK: end-user invoices (decimal dollars, not micros). */
export async function listUserInvoices(
  externalUserId: string,
  opts?: { page?: number; pageSize?: number },
) {
  const client = createPmtHouseClient();
  return client.listUserInvoices(externalUserId, opts);
}

export async function getUserInvoiceHostedUrl(
  externalUserId: string,
  invoiceId: string,
): Promise<AppUserInvoiceHostedUrlResult> {
  const client = createPmtHouseClient();
  return client.getUserInvoiceHostedUrl(externalUserId, invoiceId);
}

/** SDK: end-user payment methods. */
export async function listUserPaymentMethods(
  externalUserId: string,
): Promise<AppUserPaymentMethod[]> {
  const client = createPmtHouseClient();
  const result = await client.listUserPaymentMethods(externalUserId);
  return result.paymentMethods ?? [];
}

export async function startPaymentMethodCheckout(externalUserId: string) {
  const client = createPmtHouseClient();
  return client.createUserPaymentMethodCheckout({
    externalUserId,
    successUrl: `${appUrl()}/app/settings?topup=pm-saved`,
    cancelUrl: `${appUrl()}/app/settings?topup=canceled`,
  });
}

export async function ensureDefaultPaymentMethod(externalUserId: string) {
  const client = createPmtHouseClient();
  return client.ensureUserDefaultPaymentMethod(externalUserId);
}

/**
 * Prepaid top-up Checkout.
 * Not yet on builder-sdk — M2M POST …/billing/wallet/top-up (same as dashboard).
 */
export async function startWalletTopUp(externalUserId: string, amountUsd: number) {
  const clientId = readPublicClientId();
  const response = await fetch(
    `${appsOrigin()}/api/v1/apps/${encodeURIComponent(clientId)}/billing/wallet/top-up`,
    {
      method: "POST",
      headers: {
        Authorization: m2mAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amountUsd: amountUsd.toFixed(2),
        externalUserId,
        successUrl: `${appUrl()}/app/settings?topup=succeeded`,
        cancelUrl: `${appUrl()}/app/settings?topup=canceled`,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PmtHouseError(text || "Top-up failed", {
      status: response.status,
      code: "top_up_failed",
    });
  }
  return (await response.json()) as { checkoutUrl?: string; url?: string };
}

export type WalletLedgerEntry = {
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

/**
 * Prepaid wallet ledger (credits + usage drawdowns + invoices).
 * M2M GET …/billing/wallet/transactions
 */
export async function listWalletTransactions(
  externalUserId: string,
): Promise<{ items: WalletLedgerEntry[]; degraded: boolean }> {
  const clientId = readPublicClientId();
  const url = new URL(
    `${appsOrigin()}/api/v1/apps/${encodeURIComponent(clientId)}/billing/wallet/transactions`,
  );
  url.searchParams.set("externalUserId", externalUserId);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: m2mAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PmtHouseError(text || "Failed to load billing history", {
      status: response.status,
      code: "wallet_transactions_failed",
    });
  }
  return (await response.json()) as {
    items: WalletLedgerEntry[];
    degraded: boolean;
  };
}

export type TestUsageEventResult = {
  requestId: string;
  amountUsd: string;
  amountUsdMicros: string;
  subject: string;
  collected: boolean;
  collect?: {
    outcome: string;
    invoiceIds: string[];
  };
};

/**
 * Demo: ingest a usage CloudEvent and optionally force invoice collection.
 * M2M POST …/billing/wallet/test-usage
 */
export async function ingestTestUsageEvent(
  externalUserId: string,
  amountUsd: number,
  opts?: { collect?: boolean },
): Promise<TestUsageEventResult> {
  const clientId = readPublicClientId();
  const response = await fetch(
    `${appsOrigin()}/api/v1/apps/${encodeURIComponent(clientId)}/billing/wallet/test-usage`,
    {
      method: "POST",
      headers: {
        Authorization: m2mAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalUserId,
        amountUsd: amountUsd.toFixed(2),
        collect: opts?.collect !== false,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PmtHouseError(text || "Test usage ingest failed", {
      status: response.status,
      code: "test_usage_failed",
    });
  }
  return (await response.json()) as TestUsageEventResult;
}

export type { AppUserInvoice, AppUserPaymentMethod, BillingState, UsageBalanceResponse };
export { PmtHouseError };
