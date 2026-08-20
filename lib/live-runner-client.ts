/**
 * Browser client for ComfyStream live-runner over orch-proxied WebSocket.
 * No host WebRTC bridge / ICE / tunnel — JPEG frames on wss://{app_url}/ws_stream.
 */

export type SignerEnvelope = {
  access_token: string;
  discovery_url: string;
  signer_url?: string | null;
};

export type PaymentHandle = {
  signer_url: string;
  orchestrator_url: string;
  payment_params: string;
  manifest_id: string;
  state: Record<string, unknown> | null;
};

export type ReservedSession = {
  session_id: string;
  app_url: string;
  runner_url: string;
  ws_url: string;
  payment: PaymentHandle | null;
};

async function reserveSession(opts: {
  accessToken: string;
  discoveryUrl: string;
  signerUrl: string;
}): Promise<ReservedSession> {
  const res = await fetch("/api/live-runner/session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_token: opts.accessToken,
      discovery_url: opts.discoveryUrl,
      signer_url: opts.signerUrl,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `reserve failed (${res.status})`);
  }
  return (await res.json()) as ReservedSession;
}

async function stopSession(reserved: ReservedSession): Promise<void> {
  await fetch("/api/live-runner/session", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      runner_url: reserved.runner_url,
      session_id: reserved.session_id,
    }),
  }).catch(() => null);
}

async function tickPayment(
  accessToken: string,
  payment: PaymentHandle,
): Promise<PaymentHandle> {
  const res = await fetch("/api/live-runner/payment", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ access_token: accessToken, payment }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `payment tick failed (${res.status})`);
  }
  const data = (await res.json()) as { payment: PaymentHandle };
  return data.payment;
}

function grabJpegFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("2d canvas unavailable"));
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG encode failed"))),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Reserve → open orch-proxied wss → stream JPEG frames from a local <video>/MediaStream.
 * Output JPEGs are painted onto `outputCanvas` (and optionally mirrored to a <video> via captureStream).
 */
export async function connectViaWsStream(opts: {
  accessToken: string;
  discoveryUrl: string;
  signerUrl: string;
  prompts: unknown;
  width?: number;
  height?: number;
  /** Source element that is already playing (clip or camera). */
  localVideo: HTMLVideoElement;
  /** Canvas used to display remote frames (and optionally feed a <video>). */
  outputCanvas: HTMLCanvasElement;
  fps?: number;
  jpegQuality?: number;
  onConnectionState?: (state: string) => void;
  onReady?: (info: { session: string; modalities?: unknown }) => void;
}): Promise<{ close: () => Promise<void> }> {
  const width = opts.width ?? 512;
  const height = opts.height ?? 512;
  const fps = opts.fps ?? 8;
  const jpegQuality = opts.jpegQuality ?? 0.7;
  const signerUrl = opts.signerUrl?.trim();
  if (!signerUrl) {
    throw new Error("signer_url is required for paid live-runner sessions");
  }

  opts.onConnectionState?.("reserving");
  const discoveryUrl =
    process.env.NEXT_PUBLIC_ORCH_DISCOVERY_URL?.trim() || opts.discoveryUrl;
  const reserved = await reserveSession({
    accessToken: opts.accessToken,
    discoveryUrl,
    signerUrl,
  });

  opts.onConnectionState?.("connecting");
  const ws = new WebSocket(reserved.ws_url);
  ws.binaryType = "arraybuffer";

  let payment = reserved.payment;
  let paymentTimer: number | null = null;
  let sendTimer: number | null = null;
  let closed = false;
  const encodeCanvas = document.createElement("canvas");
  const outCtx = opts.outputCanvas.getContext("2d");

  const cleanup = async () => {
    if (closed) return;
    closed = true;
    if (paymentTimer != null) window.clearInterval(paymentTimer);
    if (sendTimer != null) window.clearInterval(sendTimer);
    withSuppress(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("eos");
    });
    withSuppress(() => ws.close());
    await stopSession(reserved);
    opts.onConnectionState?.("closed");
  };

  await new Promise<void>((resolve, reject) => {
    const onOpen = () => {
      cleanupOpen();
      resolve();
    };
    const onError = () => {
      cleanupOpen();
      reject(new Error("WebSocket connection failed"));
    };
    const cleanupOpen = () => {
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onError);
    };
    ws.addEventListener("open", onOpen);
    ws.addEventListener("error", onError);
  });

  ws.send(
    JSON.stringify({
      type: "start",
      prompts: opts.prompts,
      width,
      height,
    }),
  );

  await new Promise<void>((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      if (typeof ev.data !== "string") return;
      try {
        const msg = JSON.parse(ev.data) as {
          type?: string;
          error?: string;
          session?: string;
          modalities?: unknown;
        };
        if (msg.type === "error") {
          cleanupMsg();
          reject(new Error(msg.error || "ws_stream error"));
          return;
        }
        if (msg.type === "ready") {
          cleanupMsg();
          opts.onReady?.({
            session: msg.session || reserved.session_id,
            modalities: msg.modalities,
          });
          resolve();
        }
      } catch {
        /* ignore non-JSON */
      }
    };
    const onClose = () => {
      cleanupMsg();
      reject(new Error("WebSocket closed before ready"));
    };
    const cleanupMsg = () => {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("close", onClose);
    };
    ws.addEventListener("message", onMessage);
    ws.addEventListener("close", onClose);
  });

  opts.onConnectionState?.("connected");

  ws.addEventListener("message", (ev) => {
    if (typeof ev.data === "string") {
      try {
        const msg = JSON.parse(ev.data) as { type?: string; error?: string };
        if (msg.type === "error") {
          opts.onConnectionState?.("failed");
          void cleanup();
        }
      } catch {
        /* ignore */
      }
      return;
    }
    if (!outCtx) return;
    const blob = new Blob([ev.data], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      opts.outputCanvas.width = img.width;
      opts.outputCanvas.height = img.height;
      outCtx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  });

  ws.addEventListener("close", () => {
    void cleanup();
  });

  const intervalMs = Math.max(50, Math.floor(1000 / fps));
  sendTimer = window.setInterval(() => {
    if (closed || ws.readyState !== WebSocket.OPEN) return;
    if (opts.localVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    void grabJpegFrame(opts.localVideo, encodeCanvas, width, height, jpegQuality)
      .then(async (blob) => {
        if (closed || ws.readyState !== WebSocket.OPEN) return;
        ws.send(await blob.arrayBuffer());
      })
      .catch(() => null);
  }, intervalMs);

  if (payment) {
    paymentTimer = window.setInterval(() => {
      if (closed || !payment) return;
      void tickPayment(opts.accessToken, payment)
        .then((next) => {
          payment = next;
        })
        .catch(() => null);
    }, 3000);
  }

  return { close: cleanup };
}

function withSuppress(fn: () => void): void {
  try {
    fn();
  } catch {
    /* ignore */
  }
}
