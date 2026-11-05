/** RFC 8628 user code length from oidc-provider mask `****-****`. */
const USER_CODE_LENGTH = 8;

export type DeviceLoginReady = {
  kind: "ready";
  userCode: string;
  displayCode: string;
  /** Same-origin path to resume this approval after Auth0. */
  returnTo: string;
};

export type DeviceLoginState = { kind: "none" } | { kind: "invalid" } | DeviceLoginReady;

export function normalizeUserCode(value: string): string {
  return value.replace(/[a-z]/g, (char) => char.toUpperCase()).replace(/\W/g, "");
}

export function formatUserCode(normalized: string): string {
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
}

export function normalizeIssuerUrl(iss: string): string | null {
  try {
    const url = new URL(iss.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** Public site origin for an issuer of the form `{origin}/api/v1/oidc`. */
export function appsOriginFromIssuer(issuer: string): string | null {
  const normalized = normalizeIssuerUrl(issuer);
  if (!normalized) return null;
  const url = new URL(normalized);
  const path = url.pathname.replace(/\/+$/, "");
  const suffix = "/api/v1/oidc";
  if (!path.toLowerCase().endsWith(suffix)) return null;
  const rest = path.slice(0, -suffix.length);
  if (rest !== "") return null;
  return url.origin;
}

function firstParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

/**
 * Validate an OIDC third-party initiate-login handoff.
 * The browser stays on ComfyPeer; `target_link_uri` is parsed, never redirected to.
 */
export function parseDeviceLoginQuery(
  query: { iss?: string | null; targetLinkUri?: string | null },
  expected: { issuer: string; publicClientId: string },
): DeviceLoginReady | null {
  const expectedIssuer = normalizeIssuerUrl(expected.issuer);
  const publicClientId = expected.publicClientId.trim();
  const appsOrigin = expectedIssuer ? appsOriginFromIssuer(expectedIssuer) : null;
  const givenIssuer = normalizeIssuerUrl(query.iss ?? "");
  if (!expectedIssuer || !publicClientId || !appsOrigin || givenIssuer !== expectedIssuer) {
    return null;
  }

  let target: URL;
  try {
    target = new URL((query.targetLinkUri ?? "").trim());
  } catch {
    return null;
  }
  if (target.origin !== appsOrigin || target.pathname !== "/oidc/device" || target.hash) {
    return null;
  }
  if (target.searchParams.get("client_id")?.trim() !== publicClientId) return null;
  const targetIssuer = normalizeIssuerUrl(target.searchParams.get("iss") ?? "");
  if (targetIssuer !== expectedIssuer) return null;

  const userCode = normalizeUserCode(target.searchParams.get("user_code") ?? "");
  if (!/^[A-Z0-9]{8}$/.test(userCode) || userCode.length !== USER_CODE_LENGTH) return null;

  const displayCode = formatUserCode(userCode);
  const rebuilt = new URL("/oidc/device", appsOrigin);
  rebuilt.searchParams.set("user_code", displayCode);
  rebuilt.searchParams.set("client_id", publicClientId);
  rebuilt.searchParams.set("iss", expectedIssuer);
  const resume = new URLSearchParams();
  resume.set("iss", expectedIssuer);
  resume.set("target_link_uri", rebuilt.toString());

  return {
    kind: "ready",
    userCode,
    displayCode,
    returnTo: `/login?${resume.toString()}`,
  };
}

export function deviceLoginFromSearchParams(params: {
  iss?: string | string[];
  target_link_uri?: string | string[];
}): DeviceLoginState {
  const iss = firstParam(params.iss);
  const targetLinkUri = firstParam(params.target_link_uri);
  if (!iss && !targetLinkUri) return { kind: "none" };

  const issuer = process.env.PYMTHOUSE_ISSUER_URL?.trim() || "";
  const publicClientId = process.env.PYMTHOUSE_PUBLIC_CLIENT_ID?.trim() || "";
  const ready = parseDeviceLoginQuery({ iss, targetLinkUri }, { issuer, publicClientId });
  return ready ?? { kind: "invalid" };
}
