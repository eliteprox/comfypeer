import "server-only";

const APP_ID = "comfystream";

/** Staging orch that advertises the comfystream live-runner (not in pymthouse discover-orchestrators). */
const DEFAULT_COMFYSTREAM_DISCOVERY_URL =
  "https://ai1.eliteencoder.net:8936/discovery";

export type ReservedLiveSession = {
  session_id: string;
  app_url: string;
  runner_url: string;
  ws_url: string;
  payment: PaymentHandle | null;
};

export type PaymentHandle = {
  signer_url: string;
  orchestrator_url: string;
  payment_params: string;
  manifest_id: string;
  state: Record<string, unknown> | null;
};

type DiscoveryRunner = {
  url: string;
  app: string;
  mode?: string;
  capacity_available?: number;
};

type DiscoveryOrch = {
  address?: string;
  runners?: DiscoveryRunner[];
};

type DiscoveryScan = {
  orchCount: number;
  runnerCount: number;
  matchingAppCount: number;
  capacityZeroCount: number;
  candidates: { runnerUrl: string; orchAddress: string }[];
};

function originOf(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

/**
 * Prefer an explicit live-runner orch discovery pin over SignerSession /
 * `{signer}/discover-orchestrators`, which historically omit app=comfystream.
 */
export function resolveLiveRunnerDiscoveryUrl(requested?: string | null): string {
  const pinned =
    process.env.NEXT_PUBLIC_ORCH_DISCOVERY_URL?.trim() ||
    process.env.ORCH_DISCOVERY_URL?.trim() ||
    "";
  if (pinned) {
    return new URL(pinned).toString();
  }
  const orch = process.env.ORCH_URL?.trim() || "";
  if (orch) {
    const u = new URL(orch);
    u.pathname = "/discovery";
    u.search = "";
    u.hash = "";
    return u.toString();
  }
  const fromClient = requested?.trim() || "";
  if (fromClient) {
    return new URL(fromClient).toString();
  }
  return DEFAULT_COMFYSTREAM_DISCOVERY_URL;
}

function isSignerDiscoverOrchestratorsUrl(url: string): boolean {
  try {
    return new URL(url).pathname.replace(/\/+$/, "").endsWith("/discover-orchestrators");
  } catch {
    return false;
  }
}

function wsFromHttp(appUrl: string, path: string): string {
  const u = new URL(appUrl.replace(/\/$/, "") + path);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
}

async function fetchJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ status: number; data: unknown; headers: Headers }> {
  const { timeoutMs = 15_000, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }
  return { status: res.status, data, headers: res.headers };
}

async function signerAddress(
  signerUrl: string,
  accessToken: string,
): Promise<string> {
  const { status, data } = await fetchJson(
    `${originOf(signerUrl)}/sign-orchestrator-info`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
    },
  );
  if (status >= 400) {
    throw new Error(`signer address failed (${status})`);
  }
  const address =
    data && typeof data === "object" && "address" in data
      ? String((data as { address?: unknown }).address || "")
      : "";
  if (!address) throw new Error("signer returned no address");
  return address;
}

async function generateLivePayment(
  handle: PaymentHandle,
  accessToken: string,
): Promise<{ payment: string; segCreds: string; state: Record<string, unknown> }> {
  const payload: Record<string, unknown> = {
    orchestrator: handle.payment_params,
    type: "lv2v",
    ManifestID: handle.manifest_id,
  };
  if (handle.state) payload.state = handle.state;

  const signerOrigin = originOf(handle.signer_url);
  const { status, data } = await fetchJson(
    `${signerOrigin}/generate-live-payment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (status >= 400) {
    const detail =
      typeof data === "string"
        ? data.slice(0, 300)
        : data && typeof data === "object" && "error" in data
          ? JSON.stringify((data as { error?: unknown }).error).slice(0, 300)
          : "";
    throw new Error(
      `generate-live-payment failed (${status}) at ${signerOrigin}${
        detail ? `: ${detail}` : ""
      }`,
    );
  }
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const payment = typeof obj.payment === "string" ? obj.payment : "";
  const segCreds = typeof obj.segCreds === "string" ? obj.segCreds : "";
  const state =
    obj.state && typeof obj.state === "object"
      ? (obj.state as Record<string, unknown>)
      : null;
  if (!payment || !segCreds || !state) {
    throw new Error("generate-live-payment missing payment/segCreds/state");
  }
  return { payment, segCreds, state };
}

async function scanDiscovery(
  discoveryUrl: string,
  accessToken: string,
): Promise<DiscoveryScan> {
  const { status, data } = await fetchJson(discoveryUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (status >= 400) {
    throw new Error(`discovery failed (${status}) at ${discoveryUrl}`);
  }
  const list = Array.isArray(data) ? (data as DiscoveryOrch[]) : [];
  const scan: DiscoveryScan = {
    orchCount: list.length,
    runnerCount: 0,
    matchingAppCount: 0,
    capacityZeroCount: 0,
    candidates: [],
  };
  for (const orch of list) {
    const address = typeof orch.address === "string" ? orch.address : "";
    for (const runner of orch.runners || []) {
      scan.runnerCount += 1;
      if (runner.app !== APP_ID) continue;
      scan.matchingAppCount += 1;
      if (!runner.url) continue;
      if (typeof runner.capacity_available === "number" && runner.capacity_available <= 0) {
        scan.capacityZeroCount += 1;
        continue;
      }
      scan.candidates.push({ runnerUrl: runner.url, orchAddress: address });
    }
  }
  return scan;
}

function describeEmptyDiscovery(discoveryUrl: string, scan: DiscoveryScan): string {
  if (scan.orchCount === 0 && scan.runnerCount === 0) {
    return `discovery empty (no orchestrators) at ${discoveryUrl}`;
  }
  if (scan.matchingAppCount === 0) {
    return `no matching app "${APP_ID}" in discovery at ${discoveryUrl} (${scan.runnerCount} runners across ${scan.orchCount} orchestrators)`;
  }
  if (scan.capacityZeroCount > 0 && scan.candidates.length === 0) {
    return `app "${APP_ID}" found but capacity_available is 0 at ${discoveryUrl}`;
  }
  return `no comfystream runners available at ${discoveryUrl}`;
}

async function discoverComfyRunners(
  discoveryUrl: string,
  accessToken: string,
): Promise<{ runnerUrl: string; orchAddress: string }[]> {
  const tried = new Set<string>();
  const urls: string[] = [discoveryUrl];

  // Signer discover-orchestrators historically omits ai1/comfystream.
  if (isSignerDiscoverOrchestratorsUrl(discoveryUrl)) {
    urls.push(resolveLiveRunnerDiscoveryUrl(null));
  }
  urls.push(DEFAULT_COMFYSTREAM_DISCOVERY_URL);

  let lastUrl = discoveryUrl;
  let lastScan: DiscoveryScan | null = null;

  for (const url of urls) {
    if (tried.has(url)) continue;
    tried.add(url);
    const scan = await scanDiscovery(url, accessToken);
    if (scan.candidates.length > 0) {
      return scan.candidates;
    }
    lastUrl = url;
    lastScan = scan;
  }

  throw new Error(
    describeEmptyDiscovery(lastUrl, lastScan ?? {
      orchCount: 0,
      runnerCount: 0,
      matchingAppCount: 0,
      capacityZeroCount: 0,
      candidates: [],
    }),
  );
}

/**
 * Reserve a persistent comfystream live-runner session (402 payment challenge).
 * Caller must keep funding via {@link tickSessionPayment} while the WS is open.
 */
export async function reserveComfySession(opts: {
  accessToken: string;
  discoveryUrl: string;
  signerUrl: string;
}): Promise<ReservedLiveSession> {
  const accessToken = opts.accessToken.trim();
  const signerUrl = opts.signerUrl.trim();
  const discoveryUrl = resolveLiveRunnerDiscoveryUrl(opts.discoveryUrl);
  if (!accessToken || !signerUrl) {
    throw new Error("access_token and signer_url are required");
  }

  const runners = await discoverComfyRunners(discoveryUrl, accessToken);

  const payer = await signerAddress(signerUrl, accessToken);
  let lastError = "all runners failed";

  for (const { runnerUrl } of runners) {
    try {
      const reserved = await reserveOneRunner({
        runnerUrl,
        signerUrl,
        accessToken,
        payer,
      });
      return reserved;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
}

async function reserveOneRunner(opts: {
  runnerUrl: string;
  signerUrl: string;
  accessToken: string;
  payer: string;
}): Promise<ReservedLiveSession> {
  let challenge: {
    payment_params: string;
    orchestrator: string;
    manifest_id: string;
  } | null = null;
  let paymentHandle: PaymentHandle | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Livepeer-Payer-Address": opts.payer,
    };
    if (challenge !== null && paymentHandle !== null) {
      const paid = await generateLivePayment(paymentHandle, opts.accessToken);
      const nextHandle: PaymentHandle = {
        signer_url: paymentHandle.signer_url,
        orchestrator_url: paymentHandle.orchestrator_url,
        payment_params: paymentHandle.payment_params,
        manifest_id: paymentHandle.manifest_id,
        state: paid.state,
      };
      paymentHandle = nextHandle;
      headers["Livepeer-Payment"] = paid.payment;
      headers["Livepeer-Segment"] = paid.segCreds;
    }

    const { status, data } = await fetchJson(opts.runnerUrl, {
      method: "POST",
      headers,
      body: "{}",
      timeoutMs: 20_000,
    });

    if (status === 402) {
      const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      const payment_params =
        typeof obj.payment_params === "string" ? obj.payment_params : "";
      const orchestrator =
        typeof obj.orchestrator === "string" ? obj.orchestrator : "";
      const manifest_id =
        typeof obj.manifest_id === "string" ? obj.manifest_id : "";
      if (!payment_params || !orchestrator || !manifest_id) {
        throw new Error("402 challenge missing payment fields");
      }
      challenge = { payment_params, orchestrator, manifest_id };
      paymentHandle = {
        signer_url: opts.signerUrl,
        orchestrator_url: orchestrator,
        payment_params,
        manifest_id,
        state: paymentHandle?.state ?? null,
      };
      continue;
    }

    if (status >= 400) {
      const detail =
        typeof data === "string"
          ? data
          : data && typeof data === "object" && "error" in data
            ? String((data as { error?: unknown }).error)
            : `HTTP ${status}`;
      throw new Error(`reserve failed: ${detail}`);
    }

    const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const session_id = typeof obj.session_id === "string" ? obj.session_id.trim() : "";
    const app_url = typeof obj.app_url === "string" ? obj.app_url.trim() : "";
    if (!session_id || !app_url) {
      throw new Error("reserve response missing session_id/app_url");
    }
    return {
      session_id,
      app_url,
      runner_url: opts.runnerUrl,
      ws_url: wsFromHttp(app_url, "/ws_stream"),
      payment: paymentHandle,
    };
  }
  throw new Error("exhausted payment challenge retries");
}

/** Keep a reserved session funded (orchestrator debit tick). */
export async function tickSessionPayment(opts: {
  accessToken: string;
  payment: PaymentHandle;
}): Promise<PaymentHandle> {
  const paid = await generateLivePayment(opts.payment, opts.accessToken);
  const next: PaymentHandle = { ...opts.payment, state: paid.state };
  const url = `${originOf(opts.payment.orchestrator_url)}/payment`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Livepeer-Payment": paid.payment,
      "Livepeer-Segment": paid.segCreds,
    },
    body: "",
    signal: AbortSignal.timeout(10_000),
  });
  // 482 = skip / paid up — treat as success.
  if (res.status >= 400 && res.status !== 482) {
    const text = await res.text().catch(() => "");
    throw new Error(`payment tick failed (${res.status}): ${text}`);
  }
  return next;
}

export async function stopComfySession(opts: {
  runnerUrl: string;
  sessionId: string;
}): Promise<void> {
  // runnerUrl is …/apps/{runner}/session — stop is …/session/{id}/stop
  const base = opts.runnerUrl.replace(/\/$/, "");
  const url = `${base}/${encodeURIComponent(opts.sessionId)}/stop`;
  await fetch(url, {
    method: "POST",
    body: "",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
}
