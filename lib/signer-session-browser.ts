"use client";

export const SIGNER_SESSION_STORAGE_KEY = "comfypeer-signer-session";

export type BrowserSignerSession = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope?: string;
  signer_url?: string | null;
  discovery_url: string;
  /** Epoch ms when this envelope was stored. */
  stored_at: number;
};

export function clearSignerSession(): void {
  try {
    sessionStorage.removeItem(SIGNER_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

export function readSignerSession(): BrowserSignerSession | null {
  try {
    const raw = sessionStorage.getItem(SIGNER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowserSignerSession;
    if (!parsed?.access_token || !parsed?.discovery_url) return null;
    if (!parsed.signer_url?.trim()) return null;
    // Drop opaque pmth_*/app_* sessions — remote signer requires a JWT.
    if (!looksLikeJwt(parsed.access_token)) {
      sessionStorage.removeItem(SIGNER_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isSignerSessionFresh(
  session: BrowserSignerSession,
  skewSec = 60,
): boolean {
  const expiresIn = Number(session.expires_in) || 0;
  if (expiresIn <= 0) return true;
  const ageSec = (Date.now() - (session.stored_at || 0)) / 1000;
  return ageSec < expiresIn - skewSec;
}

export async function mintBrowserSignerSession(
  comfypeerOrigin = "",
): Promise<BrowserSignerSession> {
  const base = comfypeerOrigin.replace(/\/$/, "");
  const url = `${base}/api/pymthouse/signer-session`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `signer-session failed (${res.status})`);
  }
  const data = (await res.json()) as Omit<BrowserSignerSession, "stored_at">;
  const signerUrl = data.signer_url?.trim() || "";
  if (!data.access_token?.trim() || !data.discovery_url?.trim() || !signerUrl) {
    throw new Error("signer-session response missing access_token, discovery_url, or signer_url");
  }
  const envelope: BrowserSignerSession = {
    access_token: data.access_token,
    token_type: "Bearer",
    expires_in: Number(data.expires_in) || 0,
    scope: data.scope,
    signer_url: signerUrl,
    discovery_url: data.discovery_url,
    stored_at: Date.now(),
  };
  sessionStorage.setItem(SIGNER_SESSION_STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}

export async function ensureBrowserSignerSession(
  comfypeerOrigin = "",
): Promise<BrowserSignerSession> {
  const existing = readSignerSession();
  if (existing && isSignerSessionFresh(existing)) {
    return existing;
  }
  return mintBrowserSignerSession(comfypeerOrigin);
}
