import { appBaseUrl } from "@/lib/app-url";

export const SITE = {
  name: "ComfyPeer",
  tagline: "Your ComfyUI, live and agent-drivable.",
  oneLiner:
    "Real-time AI video from your own ComfyUI graph. Change the prompt while it runs. Billed by the second.",
  url: appBaseUrl(),
} as const;

export const NAV_MARKETING = [
  { href: "/pipelines", label: "Pipelines" },
  { href: "/pricing", label: "Pricing" },
  { href: "/agents", label: "Agents" },
  { href: "/docs", label: "Docs" },
  { href: "/network", label: "Network" },
] as const;

export const RESOLUTION_PRESETS = [
  { id: "square", label: "Square", width: 512, height: 512 },
  { id: "portrait", label: "Portrait", width: 384, height: 704 },
  { id: "landscape", label: "Landscape", width: 704, height: 384 },
] as const;

/** Curated pipelines — first two are live against comfystream liverunner. */
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
    detail: "Human-verified · $5 included · no overage",
    cta: "Start free",
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
    href: "/signup",
    featured: false,
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
