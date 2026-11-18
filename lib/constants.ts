import { appBaseUrl } from "./app-url";

export const SITE = {
  name: "ComfyPeer",
  tagline: "Stream from ComfyUI Desktop. Billed by the second.",
  oneLiner:
    "ComfyPeer is the account for Livepeer AI Streaming in ComfyUI Desktop. Install the nodes, sign in on the canvas, and stream from your graph. Billed by the second.",
  url: appBaseUrl(),
} as const;

/**
 * Public OIDC client id for ComfyUI Desktop device sign-in.
 * Not a secret. Production issuer: https://pymthouse.com/api/v1/oidc
 * Node aliases: PYMTHOUSE_PUBLIC_CLIENT_ID, PYMTHOUSE_CLIENT_ID.
 */
export const COMFYPEER_PUBLIC_CLIENT_ID = "app_444013b9d984f62f5572a282";

/** Production issuer. The website reads PYMTHOUSE_ISSUER_URL at runtime. */
export const COMFYPEER_OIDC_ISSUER = "https://pymthouse.com/api/v1/oidc";

export const NOT_YET_MEASURED = "not yet measured";

export const INSTALL = {
  displayName: "Livepeer AI Streaming",
  packageId: "livepeer-ai-nodes",
  registryUrl: "https://registry.comfy.org/nodes/livepeer-ai-nodes",
  managerSearch: "Livepeer AI Streaming",
  cliCommand: "comfy node registry-install livepeer-ai-nodes",
  redirectPath: "/go/install",
} as const;

export const NAV_MARKETING = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/pipelines", label: "Models" },
  { href: "/agents", label: "Agents" },
  { href: "/network", label: "Network" },
] as const;

export const RESOLUTION_PRESETS = [
  { id: "square", label: "Square", width: 512, height: 512 },
  { id: "portrait", label: "Portrait", width: 384, height: 704 },
  { id: "landscape", label: "Landscape", width: 704, height: 384 },
] as const;

/** Curated web-studio pipelines. Desktop remote models live in REMOTE_MODELS. */
export const PIPELINES = [
  {
    id: "av-passthrough",
    name: "Video/Audio Passthrough",
    modalities: ["video in", "audio in", "video out", "audio out"] as const,
    resolutions: ["512×512", "384×704", "704×384"] as const,
    ttffMs: 400,
    steadyFps: 30,
    rateUsdPerSec: 0.001,
    status: "available" as const,
    nodes: ["LoadTensor", "SaveTensor", "LoadAudioTensor", "SaveAudioTensor"],
    workflow: "av-passthrough-api.json" as const,
  },
  {
    id: "invert-color-av",
    name: "Inverted Color (audio passthrough)",
    modalities: ["video in", "audio in", "video out", "audio out"] as const,
    resolutions: ["512×512", "384×704", "704×384"] as const,
    ttffMs: 500,
    steadyFps: 30,
    rateUsdPerSec: 0.001,
    status: "available" as const,
    nodes: ["LoadTensor", "InvertImage", "SaveTensor", "LoadAudioTensor", "SaveAudioTensor"],
    workflow: "invert-color-av-passthrough-api.json" as const,
  },
  {
    id: "streamdiffusion-img2img",
    name: "StreamDiffusion img2img",
    modalities: ["video in", "video out"] as const,
    resolutions: ["512×512", "384×704", "704×384"] as const,
    ttffMs: 1800,
    steadyFps: 12,
    rateUsdPerSec: 0.0025,
    status: "coming" as const,
    nodes: ["LoadTensor", "StreamDiffusion", "SaveTensor"],
  },
  {
    id: "depth-control",
    name: "Depth control",
    modalities: ["video in", "video out"] as const,
    resolutions: ["512×512"] as const,
    ttffMs: 2200,
    steadyFps: 10,
    rateUsdPerSec: 0.003,
    status: "coming" as const,
    nodes: ["LoadTensor", "DepthAnything", "ControlNet", "SaveTensor"],
  },
] as const;

export const STARTER_WORKFLOWS = [
  {
    id: "stream-video-file-noop",
    title: "Stream Video File - noop",
    file: "Stream Video File - noop.json",
    needs: "a video file",
    level: "first run",
  },
  {
    id: "stream-video-file-sdxl",
    title: "Stream Video File - sdxl",
    file: "Stream Video File - sdxl.json",
    needs: "a video file",
    level: "model",
  },
  {
    id: "stream-video-frames-noop",
    title: "Stream Video Frames - noop",
    file: "Stream Video Frames - noop.json",
    needs: "a webcam or frames",
    level: "first run",
  },
  {
    id: "stream-video-frames-sdxl",
    title: "Stream Video Frames - sdxl",
    file: "Stream Video Frames - sdxl.json",
    needs: "a webcam or frames",
    level: "model",
  },
  {
    id: "image-io",
    title: "Image I-O",
    file: "Image I-O.json",
    needs: "no extra file — the graph starts from an empty image",
    level: "model",
  },
  {
    id: "livepeer-text-to-speech",
    title: "Livepeer Text to Speech",
    file: "Livepeer Text to Speech.json",
    needs: "text",
    level: "model",
  },
] as const;

export const FIRST_RUN_WORKFLOW_ID = "stream-video-file-noop" as const;

export type RemoteModel = {
  id: string;
  name: string;
  status: "coming" | "available";
  workflowId: (typeof STARTER_WORKFLOWS)[number]["id"];
  /** Present only after a Desktop model has been measured. */
  rateUsdPerSec?: number;
  ttffMs?: number;
};

/**
 * Nodes `model_id` values. Not web-studio pipeline ids.
 * Rates and TTFF stay omitted until measured.
 */
export const REMOTE_MODELS: readonly RemoteModel[] = [
  {
    id: "streamdiffusion-sdxl",
    name: "StreamDiffusion SDXL",
    status: "coming",
    workflowId: "stream-video-file-sdxl",
  },
  {
    id: "comfystream",
    name: "ComfyStream",
    status: "coming",
    workflowId: "stream-video-file-noop",
  },
];

export type Plan = {
  id: string;
  name: string;
  price: string;
  detail: string;
  cta: string;
  href: string;
  featured: boolean;
  disabled?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    detail: "Create an account. Add credit when you need it.",
    cta: "Create account",
    href: "/signup",
    featured: false,
  },
  {
    id: "payg",
    name: "Pay as you go",
    price: "Prepaid",
    detail: "Top up · retail rate cards · billed per second",
    cta: "Add credit",
    href: "/signup",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "Monthly",
    detail: "Flat fee + included usage + overage",
    cta: "Coming soon",
    href: "/pricing#pro",
    featured: false,
    disabled: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "—",
    detail: "Shared pool + seats — blocked on workspace primitive",
    cta: "Coming",
    href: "/pricing#studio",
    featured: false,
    disabled: true,
  },
];

export function starterWorkflowById(id: string) {
  return STARTER_WORKFLOWS.find((workflow) => workflow.id === id);
}

/** Dollars for `seconds` at a measured rate. Omitted when no rate exists. */
export function workflowCostUsd(
  workflow: { rateUsdPerSec?: number },
  seconds = 60,
): number | undefined {
  const rate = workflow.rateUsdPerSec;
  if (typeof rate !== "number" || !Number.isFinite(rate)) return undefined;
  return rate * seconds;
}

/** First measured Desktop model rate, or null. Never a web-studio PIPELINES rate. */
export function measuredDesktopRateUsdPerSec(): number | null {
  for (const model of REMOTE_MODELS) {
    if (model.status !== "available") continue;
    if (typeof model.rateUsdPerSec === "number" && Number.isFinite(model.rateUsdPerSec)) {
      return model.rateUsdPerSec;
    }
  }
  return null;
}

export function formatUsd(n: number, digits = 3): string {
  return `$${n.toFixed(digits)}`;
}

export function formatSecs(n: number): string {
  return `${n.toFixed(1)}s`;
}

export function microsToUsd(micros: string | number): number {
  const v = typeof micros === "string" ? Number(micros) : micros;
  if (!Number.isFinite(v)) return 0;
  return v / 1_000_000;
}
