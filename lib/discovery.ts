import "server-only";

import { getOrchestrators, type StagingOrch } from "@/lib/orchestrators";

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

export type OrchDiscovery = {
  orch: StagingOrch;
  runners: LiveRunner[];
  error?: string;
};

type DiscoveryEntry = {
  address?: string;
  runners?: LiveRunner[];
};

function discoveryUrl(orchUrl: string): string {
  return `${orchUrl.replace(/\/$/, "")}/discovery`;
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

export async function fetchLiveRunners(orchUrl: string): Promise<{
  runners: LiveRunner[];
  error?: string;
}> {
  const url = discoveryUrl(orchUrl);
  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { runners: [], error: `HTTP ${res.status}` };
    }
    const data: unknown = await res.json();
    if (!Array.isArray(data)) {
      return { runners: [], error: "unexpected discovery shape" };
    }
    const runners: LiveRunner[] = [];
    for (const entry of data as DiscoveryEntry[]) {
      if (!entry || typeof entry !== "object") continue;
      for (const runner of entry.runners ?? []) {
        if (runner && typeof runner.app === "string" && runner.app.trim()) {
          runners.push(runner);
        }
      }
    }
    return { runners };
  } catch (err) {
    const message = err instanceof Error ? err.message : "discovery failed";
    return { runners: [], error: message };
  }
}

export async function fetchAllOrchDiscoveries(): Promise<OrchDiscovery[]> {
  const orchs = getOrchestrators();
  return Promise.all(
    orchs.map(async (orch) => {
      const { runners, error } = await fetchLiveRunners(orch.url);
      return { orch, runners, error };
    }),
  );
}
