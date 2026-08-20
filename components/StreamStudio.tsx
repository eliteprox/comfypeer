"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Film, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/Button";
import { connectViaWsStream } from "@/lib/live-runner-client";
import { ensureBrowserSignerSession } from "@/lib/signer-session-browser";
import {
  PIPELINES,
  RESOLUTION_PRESETS,
  formatSecs,
  formatUsd,
} from "@/lib/constants";
import avPassthrough from "@/lib/workflows/av-passthrough-api.json";
import invertColorAv from "@/lib/workflows/invert-color-av-passthrough-api.json";

const WORKFLOWS: Record<string, unknown> = {
  "av-passthrough-api.json": avPassthrough,
  "invert-color-av-passthrough-api.json": invertColorAv,
};

/** Same CC0 sample used by the previous LiveDemoWidget. */
const SAMPLE_CLIP_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

type Phase = "idle" | "connecting" | "live" | "paused";
type InputSource = "clip" | "camera";

type Props = {
  pipelineId: string;
  resId: string;
};

function captureVideoStream(video: HTMLVideoElement): MediaStream {
  const withCapture = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  const stream =
    withCapture.captureStream?.() ?? withCapture.mozCaptureStream?.();
  if (!stream) {
    throw new Error("This browser cannot capture a MediaStream from a video clip");
  }
  return stream;
}

/** Sample clip is video-only; silent audio kept for camera-parity workflows. */
function attachSilentAudio(
  stream: MediaStream,
  audioCtxRef: { current: AudioContext | null },
): MediaStream {
  if (stream.getAudioTracks().length > 0) return stream;
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const dest = ctx.createMediaStreamDestination();
  oscillator.connect(gain);
  gain.connect(dest);
  oscillator.start();
  for (const track of dest.stream.getAudioTracks()) {
    stream.addTrack(track);
  }
  audioCtxRef.current?.close().catch(() => null);
  audioCtxRef.current = ctx;
  return stream;
}

export function StreamStudio({ pipelineId, resId }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const clipAudioCtxRef = useRef<AudioContext | null>(null);
  const sessionCloseRef = useRef<(() => Promise<void>) | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accruedRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [inputSource, setInputSource] = useState<InputSource>("clip");
  const [elapsed, setElapsed] = useState(0);
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [connState, setConnState] = useState<string>("—");

  const pipeline = PIPELINES.find((p) => p.id === pipelineId) ?? PIPELINES[0]!;
  const res = RESOLUTION_PRESETS.find((r) => r.id === resId) ?? RESOLUTION_PRESETS[0]!;
  const rate = pipeline.rateUsdPerSec;
  const runnable = "workflow" in pipeline && pipeline.status === "available";

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => {
      if (startedAtRef.current == null) return;
      const secs =
        (performance.now() - startedAtRef.current) / 1000 + accruedRef.current;
      setElapsed(secs);
      setCost(secs * rate);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, rate]);

  const clearLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (clipAudioCtxRef.current) {
      void clipAudioCtxRef.current.close().catch(() => null);
      clipAudioCtxRef.current = null;
    }
  }, []);

  const teardown = useCallback(async () => {
    if (sessionCloseRef.current) {
      await sessionCloseRef.current().catch(() => null);
      sessionCloseRef.current = null;
    }
    const canvas = remoteCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (startedAtRef.current != null) {
      accruedRef.current +=
        (performance.now() - startedAtRef.current) / 1000;
      startedAtRef.current = null;
    }
    setPhase("idle");
    setConnState("—");
  }, []);

  const ensureSampleClip = useCallback(async (): Promise<MediaStream> => {
    const video = localVideoRef.current;
    if (!video) throw new Error("Input video element missing");

    clearLocalStream();
    video.srcObject = null;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    if (video.src !== SAMPLE_CLIP_URL) {
      video.src = SAMPLE_CLIP_URL;
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Failed to load sample clip"));
        };
        const cleanup = () => {
          video.removeEventListener("loadeddata", onReady);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("loadeddata", onReady, { once: true });
        video.addEventListener("error", onError, { once: true });
        video.load();
      });
    }
    await video.play();
    const stream = attachSilentAudio(captureVideoStream(video), clipAudioCtxRef);
    localStreamRef.current = stream;
    setInputSource("clip");
    return stream;
  }, [clearLocalStream]);

  const ensureCamera = useCallback(async (): Promise<MediaStream> => {
    clearLocalStream();
    const video = localVideoRef.current;
    if (video) {
      video.removeAttribute("src");
      video.srcObject = null;
      video.load();
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: res.width },
        height: { ideal: res.height },
      },
      audio: true,
    });
    localStreamRef.current = stream;
    if (video) {
      video.srcObject = stream;
      await video.play().catch(() => null);
    }
    setInputSource("camera");
    return stream;
  }, [clearLocalStream, res.width, res.height]);

  const ensureLocalStream = useCallback(async () => {
    if (inputSource === "camera") return ensureCamera();
    return ensureSampleClip();
  }, [inputSource, ensureCamera, ensureSampleClip]);

  // Default preview: looping sample clip (same as LiveDemoWidget).
  useEffect(() => {
    if (phase !== "idle") return;
    void ensureSampleClip().catch(() => null);
  }, [phase, ensureSampleClip]);

  useEffect(() => {
    return () => {
      void teardown();
      clearLocalStream();
    };
  }, [teardown, clearLocalStream]);

  const start = useCallback(async () => {
    setError(null);
    if (!runnable) {
      setError("Selected pipeline is not available on the live-runner yet.");
      return;
    }
    const workflowKey =
      "workflow" in pipeline ? String(pipeline.workflow) : "";
    const prompts = WORKFLOWS[workflowKey];
    if (!prompts) {
      setError("Missing workflow JSON for pipeline.");
      return;
    }

    setPhase("connecting");
    try {
      await ensureLocalStream();
      const video = localVideoRef.current;
      const canvas = remoteCanvasRef.current;
      if (!video || !canvas) {
        throw new Error("Preview elements missing");
      }
      const signer = await ensureBrowserSignerSession("");
      const signerUrl = signer.signer_url?.trim() || "";
      if (!signerUrl) {
        throw new Error("SignerSession missing signer_url from exchange");
      }
      const session = await connectViaWsStream({
        accessToken: signer.access_token,
        discoveryUrl: signer.discovery_url,
        signerUrl,
        prompts,
        width: res.width,
        height: res.height,
        localVideo: video,
        outputCanvas: canvas,
        onConnectionState: (state) => {
          setConnState(state);
          if (state === "connected") {
            startedAtRef.current = performance.now();
            setPhase("live");
          }
          if (state === "failed" || state === "closed") {
            void teardown();
          }
        },
      });
      sessionCloseRef.current = session.close;
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Failed to start stream");
      await teardown();
    }
  }, [runnable, pipeline, ensureLocalStream, res.width, res.height, teardown]);

  const pause = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => {
      t.enabled = false;
    });
    const video = localVideoRef.current;
    if (inputSource === "clip" && video) video.pause();
    if (startedAtRef.current != null) {
      accruedRef.current +=
        (performance.now() - startedAtRef.current) / 1000;
      startedAtRef.current = null;
    }
    setPhase("paused");
  }, [inputSource]);

  const resume = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => {
      t.enabled = true;
    });
    const video = localVideoRef.current;
    if (inputSource === "clip" && video) void video.play().catch(() => null);
    startedAtRef.current = performance.now();
    setPhase("live");
  }, [inputSource]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <VideoPreview label="Input" videoRef={localVideoRef} />
        <CanvasPreview label="Output" canvasRef={remoteCanvasRef} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted">
        <span>
          input{" "}
          <span className="text-fg">{inputSource === "clip" ? "clip" : "camera"}</span>
        </span>
        <span>
          elapsed <span className="text-fg">{formatSecs(elapsed)}</span>
        </span>
        <span>
          cost <span className="text-live">{formatUsd(cost)}</span>
        </span>
        <span>
          rate {formatUsd(rate)}/s
        </span>
        <span>ws {connState}</span>
        <span className="text-faint">{pipeline.nodes.join(" → ")}</span>
      </div>

      {error ? (
        <p className="rounded-md border border-billing-warn/40 bg-elevated px-3 py-2 text-sm text-billing-warn">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {phase === "idle" || phase === "connecting" ? (
          <Button
            type="button"
            variant="primary"
            className="!py-1.5 text-sm"
            disabled={phase === "connecting"}
            onClick={() => {
              void start();
            }}
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
            {phase === "connecting" ? "Connecting…" : "Run"}
          </Button>
        ) : null}
        {phase === "live" ? (
          <Button
            type="button"
            variant="secondary"
            className="!py-1.5 text-sm"
            onClick={pause}
          >
            <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> Pause
          </Button>
        ) : null}
        {phase === "paused" ? (
          <Button
            type="button"
            variant="primary"
            className="!py-1.5 text-sm"
            onClick={resume}
          >
            <Play className="h-3.5 w-3.5" strokeWidth={1.5} /> Resume
          </Button>
        ) : null}
        {phase !== "idle" ? (
          <Button
            type="button"
            variant="ghost"
            className="!py-1.5 text-sm"
            onClick={() => {
              void teardown();
            }}
          >
            <Square className="h-3.5 w-3.5" strokeWidth={1.5} /> Stop
          </Button>
        ) : null}
        {phase === "idle" ? (
          <>
            <Button
              type="button"
              variant={inputSource === "clip" ? "primary" : "secondary"}
              className="!py-1.5 text-sm"
              onClick={() => {
                void ensureSampleClip().catch((err) =>
                  setError(err instanceof Error ? err.message : "Clip failed"),
                );
              }}
            >
              <Film className="h-3.5 w-3.5" strokeWidth={1.5} /> Sample clip
            </Button>
            <Button
              type="button"
              variant={inputSource === "camera" ? "primary" : "secondary"}
              className="!py-1.5 text-sm"
              onClick={() => {
                void ensureCamera().catch((err) =>
                  setError(err instanceof Error ? err.message : "Camera failed"),
                );
              }}
            >
              <Camera className="h-3.5 w-3.5" strokeWidth={1.5} /> Camera
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function VideoPreview({
  label,
  videoRef,
}: {
  label: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-elevated">
      <div className="flex items-center justify-between border-b border-border px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black object-contain"
        playsInline
        muted
        autoPlay
      />
    </div>
  );
}

function CanvasPreview({
  label,
  canvasRef,
}: {
  label: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-elevated">
      <div className="flex items-center justify-between border-b border-border px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <canvas
        ref={canvasRef}
        className="aspect-video w-full bg-black object-contain"
      />
    </div>
  );
}
