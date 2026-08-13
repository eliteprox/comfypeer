import "server-only";

import { mintOwnerSignerSession, PmtHouseError } from "@/lib/pymthouse";

export type LiveRunnerPriceInfo = {
  price: number;
  currency: string;
  unit: string;
};

export type LiveRunner = {
  app: string;
  url?: string;
  mode?: string;
  capacity?: number;
  capacity_used?: number;
  capacity_available?: number;
  metadata?: string;
  price_info?: LiveRunnerPriceInfo;
  gpu?: {
    id?: string;
    name?: string;
    vram_mb?: number;
  };
};

export type Orchestrator = {
  id: string;
  url: string;
  label: string;
};

export type OrchDiscovery = {
  orch: Orchestrator;
  runners: LiveRunner[];
  error?: string;
};

type DiscoveryEntry = {
  address?: string;
  runners?: LiveRunner[];
};

const CACHE_TTL_MS = 30_000;

let discoveryCache: { expiresAt: number; value: OrchDiscovery[] } | null = null;

function labelFromOrchUrl(url: string, index: number): string {
  try {
    return new URL(url).hostname.replace(/\.daydream\.monster$/, "") || `orch-${index + 1}`;
  } catch {
    return `orch-${index + 1}`;
  }
}

function discoveryFailure(message: string, url = ""): OrchDiscovery[] {
  return [
    {
      orch: {
        id: "discovery",
        url,
        label: "discovery",
      },
      runners: [],
      error: message,
    },
  ];
}

function parseDiscoveryList(data: unknown): OrchDiscovery[] | { error: string } {
  if (!Array.isArray(data)) {
    return { error: "unexpected discovery shape" };
  }
  const out: OrchDiscovery[] = [];
  let index = 0;
  for (const entry of data as DiscoveryEntry[]) {
    if (!entry || typeof entry !== "object") continue;
    const url = typeof entry.address === "string" ? entry.address.trim() : "";
    if (!url) continue;
    const runners: LiveRunner[] = [];
    for (const runner of entry.runners ?? []) {
      if (runner && typeof runner.app === "string" && runner.app.trim()) {
        runners.push(runner);
      }
    }
    out.push({
      orch: {
        id: String(index + 1),
        url,
        label: labelFromOrchUrl(url, index),
      },
      runners,
    });
    index += 1;
  }
  return out;
}

export function parseRunnerMetadata(raw: string | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function runnerSurfaces(runner: LiveRunner): string[] {
  const meta = parseRunnerMetadata(runner.metadata);
  const surfaces = meta?.surfaces;
  if (Array.isArray(surfaces)) {
    return surfaces.filter((s): s is string => typeof s === "string");
  }
  return [];
}

/** Format live-runner price_info for Network (crypto vocab OK here). */
export function formatRunnerPrice(info: LiveRunnerPriceInfo | undefined): string {
  if (!info || typeof info.price !== "number" || !Number.isFinite(info.price)) {
    return "—";
  }
  const currency = info.currency || "wei";
  const unit = info.unit || "seconds";
  if (currency === "wei") {
    return `${info.price.toLocaleString("en-US")} wei/${unit === "seconds" ? "s" : unit}`;
  }
  return `${info.price} ${currency}/${unit}`;
}

async function fetchDiscoveriesFromSignerSession(): Promise<OrchDiscovery[]> {
  let discoveryUrl = "";
  try {
    const session = await mintOwnerSignerSession();
    discoveryUrl = session.discoveryUrl;
    const res = await fetch(session.discoveryUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return discoveryFailure(`HTTP ${res.status}`, session.discoveryUrl);
    }
    const parsed = parseDiscoveryList(await res.json());
    if (!Array.isArray(parsed)) {
      return discoveryFailure(parsed.error, session.discoveryUrl);
    }
    return parsed;
  } catch (err) {
    const message =
      err instanceof PmtHouseError
        ? err.message
        : err instanceof Error
          ? err.message
          : "discovery failed";
    return discoveryFailure(message, discoveryUrl);
  }
}

export async function fetchAllOrchDiscoveries(): Promise<OrchDiscovery[]> {
  if (discoveryCache && discoveryCache.expiresAt > Date.now()) {
    return discoveryCache.value;
  }
  const value = await fetchDiscoveriesFromSignerSession();
  discoveryCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  };
  return value;
}

export async function getPrimaryOrchestrator(): Promise<Orchestrator | null> {
  const discoveries = await fetchAllOrchDiscoveries();
  const healthy = discoveries.find((d) => !d.error && d.orch.url);
  return healthy?.orch ?? null;
}
