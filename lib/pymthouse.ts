import "server-only";

import {
  loadAuthorizationServer,
  PmtHouseClient,
  PmtHouseError,
  SIGN_JOB_SCOPE,
  type AppUserInvoice,
  type AppUserInvoiceHostedUrlResult,
  type AppUserPaymentMethod,
} from "@pymthouse/builder-sdk";
import { appBaseUrl } from "@/lib/app-url";

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

export type OwnerSignerSession = {
  accessToken: string;
  discoveryUrl: string;
};

export type UserSignerSession = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  scope: string;
  signerUrl?: string;
  discoveryUrl: string;
};

function absoluteHttpUrl(raw: string, field: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new PmtHouseError(`${field} must be an absolute http(s) URL`, {
      status: 502,
      code: "missing_discovery_url",
    });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PmtHouseError(`${field} must be an http(s) URL`, {
      status: 502,
      code: "missing_discovery_url",
    });
  }
  return parsed;
}

function discoverOrchestratorsUrlFromSigner(signerUrl: string): string {
  const parsed = absoluteHttpUrl(signerUrl, "signer_url");
  parsed.search = "";
  parsed.hash = "";
  let basePath = parsed.pathname;
  while (basePath.length > 1 && basePath.endsWith("/")) {
    basePath = basePath.slice(0, -1);
  }
  if (basePath === "/") {
    basePath = "";
  }
  parsed.pathname = `${basePath}/discover-orchestrators`;
  return parsed.toString();
}

function discoveryUrlFromSignerSession(body: Record<string, unknown>): string {
  const discovery = typeof body.discovery_url === "string" ? body.discovery_url.trim() : "";
  if (discovery) {
    return absoluteHttpUrl(discovery, "discovery_url").toString();
  }
  const signer = typeof body.signer_url === "string" ? body.signer_url.trim() : "";
  if (signer) {
    return discoverOrchestratorsUrlFromSigner(signer);
  }
  throw new PmtHouseError("SignerSession did not suggest a discovery_url", {
    status: 502,
    code: "missing_discovery_url",
  });
}

/**
 * Mint an owner SignerSession via M2M `sign:job` and read the suggested
 * remote-signer discovery URL (`discovery_url`, else `{signer_url}/discover-orchestrators`).
 */
export async function mintOwnerSignerSession(): Promise<OwnerSignerSession> {
  const config = readPymthouseM2mConfig();
  if (!config) {
    throw new PmtHouseError(
      "Pymthouse is not configured. Set PYMTHOUSE_ISSUER_URL, PYMTHOUSE_M2M_CLIENT_ID, and PYMTHOUSE_M2M_CLIENT_SECRET.",
      { status: 503, code: "pymthouse_required" },
    );
  }

  const as = await loadAuthorizationServer(config.issuerUrl, fetch, {
    allowInsecureHttp: config.allowInsecureHttp,
  });
  const tokenEndpoint = as.token_endpoint;
  if (!tokenEndpoint) {
    throw new PmtHouseError("OIDC discovery document is missing token_endpoint", {
      status: 500,
      code: "oidc_discovery_invalid",
    });
  }

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: m2mAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: SIGN_JOB_SCOPE,
    }).toString(),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PmtHouseError(text || "SignerSession mint failed", {
      status: response.status,
      code: "signer_session_failed",
    });
  }

  const parsed: unknown = await response.json();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PmtHouseError("SignerSession mint returned invalid JSON", {
      status: 502,
      code: "invalid_token_response",
    });
  }
  const body = parsed as Record<string, unknown>;
  const accessToken = typeof body.access_token === "string" ? body.access_token.trim() : "";
  if (!accessToken) {
    throw new PmtHouseError("SignerSession mint returned no access_token", {
      status: 502,
      code: "invalid_token_response",
    });
  }

  return {
    accessToken,
    discoveryUrl: discoveryUrlFromSignerSession(body),
  };
}

/**
 * Mint a per-end-user SignerSession (short-lived opaque/JWT) for browser studio jobs.
 * Discovery prefers env pin, then token `discovery_url`, then `{signer_url}/discover-orchestrators`.
 */
export async function mintUserSignerSession(externalUserId: string): Promise<UserSignerSession> {
  const client = createPmtHouseClient();
  const exchanged = await client.mintUserSignerSessionToken({
    externalUserId,
    scope: SIGN_JOB_SCOPE,
  });
  const accessToken = exchanged.access_token?.trim() || "";
  if (!accessToken) {
    throw new PmtHouseError("SignerSession mint returned no access_token", {
      status: 502,
      code: "invalid_token_response",
    });
  }

  const pinned = process.env.NEXT_PUBLIC_ORCH_DISCOVERY_URL?.trim() || "";
  let discoveryUrl = "";
  if (pinned) {
    discoveryUrl = absoluteHttpUrl(pinned, "NEXT_PUBLIC_ORCH_DISCOVERY_URL").toString();
  } else {
    try {
      const body: Record<string, unknown> = { ...exchanged };
      discoveryUrl = discoveryUrlFromSignerSession(body);
    } catch {
      discoveryUrl = absoluteHttpUrl(
        "https://ai1.eliteencoder.net:8936/discovery",
        "default_discovery_url",
      ).toString();
    }
  }

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: Number(exchanged.expires_in) || 0,
    scope: typeof exchanged.scope === "string" ? exchanged.scope : SIGN_JOB_SCOPE,
    signerUrl: exchanged.signer_url?.trim() || undefined,
    discoveryUrl,
  };
}

export function pymthouseAppsOrigin(): string {
  return appsOrigin();
}

export function pymthouseM2mAuthHeader(): string {
  return m2mAuthHeader();
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

export function isUserNotFoundError(error: unknown): boolean {
  if (!(error instanceof PmtHouseError)) return false;
  return error.status === 404 || error.code === "user_not_found" || error.code === "not_found";
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

export type UserCreditBalance = {
  externalUserId: string;
  customerId: string;
  currency: string;
  live: string;
  pending: string;
  settled: string;
  retrievedAt: string | null;
};

/** Konnect GET /credits/balance for this end user. Use `live` to gate spend. */
export async function loadUserCreditBalance(externalUserId: string): Promise<UserCreditBalance> {
  await ensureAppUserProvisioned(externalUserId);
  const clientId = readPublicClientId();
  const response = await fetch(
    `${appsOrigin()}/api/v1/apps/${encodeURIComponent(clientId)}/users/${encodeURIComponent(externalUserId)}/allowances`,
    {
      method: "GET",
      headers: {
        Authorization: m2mAuthHeader(),
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new PmtHouseError(text || "Failed to load credit balance", {
      status: response.status,
      code: "credit_balance_failed",
    });
  }
  return (await response.json()) as UserCreditBalance;
}

export type WalletAutoTopUp = {
  enabled: boolean;
  amountUsd: string | null;
};

function merchantWalletUrl(externalUserId?: string): URL {
  const clientId = readPublicClientId();
  const url = new URL(`${appsOrigin()}/api/v1/apps/${encodeURIComponent(clientId)}/billing/wallet`);
  if (externalUserId) {
    url.searchParams.set("externalUserId", externalUserId);
  }
  return url;
}

async function merchantWalletRequest(
  url: URL,
  init: RequestInit,
  fallbackMessage: string,
  fallbackCode: string,
): Promise<Response> {
  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: m2mAuthHeader(),
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (response.ok) return response;
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };
  throw new PmtHouseError(body.error || fallbackMessage, {
    status: response.status,
    code: body.code || fallbackCode,
  });
}

export type MerchantWalletPayload = {
  autoTopUp?: WalletAutoTopUp | null;
  billingState?: unknown;
};

/** GET …/billing/wallet — auto-top-up prefs + billingState (included usage). */
export async function loadMerchantWallet(
  externalUserId: string,
): Promise<MerchantWalletPayload> {
  const response = await merchantWalletRequest(
    merchantWalletUrl(externalUserId),
    { method: "GET" },
    "Failed to load wallet",
    "wallet_load_failed",
  );
  return (await response.json()) as MerchantWalletPayload;
}

/** Merchant wallet auto-top-up prefs from GET …/billing/wallet. */
export async function loadWalletAutoTopUp(externalUserId: string): Promise<WalletAutoTopUp> {
  const body = await loadMerchantWallet(externalUserId);
  return body.autoTopUp ?? { enabled: false, amountUsd: null };
}

export async function saveWalletAutoTopUp(input: {
  externalUserId: string;
  enabled: boolean;
  amountUsd: string;
}): Promise<WalletAutoTopUp> {
  const response = await merchantWalletRequest(
    merchantWalletUrl(),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        externalUserId: input.externalUserId,
        enabled: input.enabled,
        amountUsd: input.amountUsd,
      }),
    },
    "Failed to save auto top-up",
    "auto_topup_save_failed",
  );
  const body = (await response.json()) as { autoTopUp?: WalletAutoTopUp };
  return body.autoTopUp ?? { enabled: input.enabled, amountUsd: input.amountUsd };
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
    successUrl: `${appBaseUrl()}/app/settings?topup=pm-saved`,
    cancelUrl: `${appBaseUrl()}/app/settings?topup=canceled`,
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
        successUrl: `${appBaseUrl()}/app/settings?topup=succeeded`,
        cancelUrl: `${appBaseUrl()}/app/settings?topup=canceled`,
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
 * Demo: ingest a usage CloudEvent. Collection is opt-in (`collect: true`);
 * the default matches production traffic (automatic invoice path only).
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
        collect: opts?.collect === true,
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

export type { AppUserInvoice, AppUserPaymentMethod };
export { PmtHouseError };
