import "server-only";

import { PmtHouseClient, PmtHouseError } from "@pymthouse/builder-sdk";

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

export function appsOrigin(): string {
  const issuer = process.env.PYMTHOUSE_ISSUER_URL?.trim();
  if (!issuer) {
    throw new PmtHouseError("PYMTHOUSE_ISSUER_URL is required", {
      status: 503,
      code: "pymthouse_required",
    });
  }
  return issuer.replace(/\/api\/v1\/oidc\/?$/i, "");
}

export function m2mAuthHeader(): string {
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
    // Fallback to raw POST for environments that only accept that shape.
    const clientId = readPublicClientId();
    const response = await fetch(`${appsOrigin()}/api/v1/apps/${clientId}/users`, {
      method: "POST",
      headers: {
        Authorization: m2mAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalUserId,
        ...(email?.trim() ? { email: email.trim() } : {}),
        status: "active",
      }),
    });
    if (response.ok || response.status === 409) return;
    const text = await response.text().catch(() => "");
    throw new PmtHouseError(text || "Failed to provision user", {
      status: response.status,
      code: "provision_failed",
    });
  }
}

export async function mintEndUserAccessToken(externalUserId: string): Promise<string> {
  const client = createPmtHouseClient();
  try {
    const minted = await client.mintUserAccessToken({ externalUserId });
    return minted.access_token;
  } catch (error) {
    if (isUserNotFoundError(error)) {
      await ensureAppUserProvisioned(externalUserId);
      const minted = await client.mintUserAccessToken({ externalUserId });
      return minted.access_token;
    }
    throw error;
  }
}

export async function createUserApiKey(externalUserId: string, label?: string) {
  await ensureAppUserProvisioned(externalUserId);
  const clientId = readPublicClientId();
  const url = `${appsOrigin()}/api/v1/apps/${encodeURIComponent(clientId)}/users/${encodeURIComponent(externalUserId)}/keys`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: m2mAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(label ? { label } : {}),
    cache: "no-store",
  });
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

export async function startWalletTopUp(externalUserId: string, amountUsd: number) {
  // Builder API: POST /api/v1/apps/{clientId}/billing/wallet/top-up (M2M Basic).
  // There is no /api/v1/user/billing/wallet/* route — that 404s as HTML on the
  // pymthouse Next app. Pass externalUserId for merchant end-user checkout.
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
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
        successUrl: `${origin}/app/settings?topup=success`,
        cancelUrl: `${origin}/app/settings?topup=cancel`,
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
  return (await response.json()) as { url?: string; checkoutUrl?: string };
}

export { PmtHouseError };
