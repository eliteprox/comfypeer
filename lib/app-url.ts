/** Canonical public origin for the ComfyPeer app (Auth0 callbacks, CORS, redirects). */
export const DEFAULT_APP_BASE_URL = "http://localhost:3000";

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_BASE_URL;
}
