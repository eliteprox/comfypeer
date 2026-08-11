"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Pause, Play, RefreshCw } from "lucide-react";
import { formatSecs, formatUsd, PIPELINES } from "@/lib/constants";

const RATE = PIPELINES[0]!.rateUsdPerSec;

type Phase = "idle" | "warmup" | "live" | "paused";

export function LiveDemoWidget() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accruedRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState("neon cyberpunk city, rain, cinematic");
  const [elapsed, setElapsed] = useState(0);
  const [cost, setCost] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const paintOutput = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Light “processed” look: cool tint + prompt watermark — local demo only.
    ctx.fillStyle = "rgba(61,255,154,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(242,242,245,0.85)";
    ctx.font = "12px JetBrains Mono, monospace";
    ctx.fillText(prompt.slice(0, 48), 12, canvas.height - 14);
  }, [prompt]);

  const tick = useCallback(() => {
    paintOutput();
    if (startedAtRef.current != null) {
      const now = performance.now();
      const secs = (now - startedAtRef.current) / 1000 + accruedRef.current;
      setElapsed(secs);
      setCost(secs * RATE);
      setFps(Math.min(30, 8 + Math.floor((secs * 3) % 5)));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [paintOutput]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("warmup");
      window.setTimeout(() => {
        setPhase("live");
        startedAtRef.current = performance.now();
        accruedRef.current = 0;
        if (!reducedMotion) {
          stopLoop();
          rafRef.current = requestAnimationFrame(tick);
        } else {
          paintOutput();
          setElapsed(0);
          setCost(0);
          setFps(0);
        }
      }, 1200);
    } catch {
      setError("Camera blocked — use sample mode below, or allow webcam access.");
      setPhase("idle");
    }
  }, [paintOutput, reducedMotion, stopLoop, tick]);

  const useSample = useCallback(() => {
    setError(null);
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = null;
    video.src =
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    video.loop = true;
    video.muted = true;
    void video.play();
    setPhase("warmup");
    window.setTimeout(() => {
      setPhase("live");
      startedAtRef.current = performance.now();
      accruedRef.current = 0;
      if (!reducedMotion) {
        stopLoop();
        rafRef.current = requestAnimationFrame(tick);
      } else {
        paintOutput();
      }
    }, 900);
  }, [paintOutput, reducedMotion, stopLoop, tick]);

  const pause = useCallback(() => {
    if (phase !== "live") return;
    if (startedAtRef.current != null) {
      accruedRef.current += (performance.now() - startedAtRef.current) / 1000;
      startedAtRef.current = null;
    }
    stopLoop();
    setPhase("paused");
  }, [phase, stopLoop]);

  const resume = useCallback(() => {
    if (phase !== "paused") return;
    startedAtRef.current = performance.now();
    setPhase("live");
    if (!reducedMotion) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [phase, reducedMotion, tick]);

  useEffect(() => {
    const videoEl = videoRef.current;
    return () => {
      stopLoop();
      const stream = videoEl?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stopLoop]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid gap-0 md:grid-cols-2">
        <div className="relative aspect-video bg-elevated">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {phase === "idle" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/70 p-4 text-center">
              <Camera className="h-8 w-8 text-cool" strokeWidth={1.5} />
              <p className="text-sm text-muted">Webcam in → live out. No signup.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="rounded-md bg-live px-4 py-2 text-sm font-semibold text-canvas"
                >
                  Start camera
                </button>
                <button
                  type="button"
                  onClick={useSample}
                  className="rounded-md border border-border-strong px-4 py-2 text-sm text-fg hover:bg-elevated"
                >
                  Sample clip
                </button>
              </div>
            </div>
          ) : null}
          {phase === "warmup" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-canvas/60">
              <div className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm font-mono text-muted">
                <RefreshCw className="h-4 w-4 animate-spin text-live" strokeWidth={1.75} />
                warmup · TTFF ~1.8s
              </div>
            </div>
          ) : null}
          <span className="absolute left-3 top-3 rounded bg-canvas/80 px-2 py-0.5 font-mono text-xs text-muted">
            input
          </span>
        </div>
        <div className="relative aspect-video bg-canvas">
          <canvas ref={canvasRef} className="h-full w-full object-cover" />
          {phase === "idle" ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-faint">
              Output appears here
            </div>
          ) : null}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded bg-canvas/80 px-2 py-0.5 font-mono text-xs text-live">
            <span className="h-1.5 w-1.5 rounded-full bg-live live-pulse" />
            output
          </span>
        </div>
      </div>

      <div className="border-t border-border p-4">
        <label htmlFor="demo-prompt" className="mb-1.5 block text-xs font-medium text-muted">
          Prompt — change it mid-stream
        </label>
        <input
          id="demo-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
          placeholder="Describe the style…"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 font-mono text-xs tabular-nums text-muted sm:text-sm">
            <span>
              cost <span className="text-live">{formatUsd(cost)}</span>
            </span>
            <span>
              elapsed <span className="text-fg">{formatSecs(elapsed)}</span>
            </span>
            <span>
              fps <span className="text-fg">{fps}</span>
            </span>
            <span>
              rate <span className="text-fg">{formatUsd(RATE)}/s</span>
            </span>
          </div>
          <div className="flex gap-2">
            {phase === "live" ? (
              <button
                type="button"
                onClick={pause}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-elevated"
              >
                <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> Pause
              </button>
            ) : null}
            {phase === "paused" ? (
              <button
                type="button"
                onClick={resume}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-elevated"
              >
                <Play className="h-3.5 w-3.5" strokeWidth={1.5} /> Resume
              </button>
            ) : null}
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-billing-block">
            {error}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-faint">
          Local preview demo — cost ticker uses StreamDiffusion retail rate. Production runs
          land on staging orchestrators and meter via PymtHouse.
        </p>
      </div>
    </div>
  );
}
