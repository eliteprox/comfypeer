import "server-only";

/**
 * Structured server log. No vendor, no database, no browser payload.
 * Allowed properties are an allowlist so a caller cannot attach a user code,
 * email, address, or raw user agent.
 */
const ALLOWED_PROPS = new Set(["source", "device_class", "workflow", "amount_usd"]);

export type TrackProps = Record<string, string | number | boolean | undefined>;

export function track(event: string, props: TrackProps = {}): void {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(key) || value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  console.info(JSON.stringify({ event, ...safe }));
}
