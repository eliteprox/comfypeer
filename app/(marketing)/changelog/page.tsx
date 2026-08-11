import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
};

const ENTRIES = [
  {
    date: "2026-08-11",
    title: "ComfyPeer v0.1 — staging launch",
    body: "Marketing site, studio shell, PymtHouse staging wiring, three liverunner orchestrators on :8936.",
  },
  {
    date: "2026-08-11",
    title: "Pipelines catalog",
    body: "StreamDiffusion img2img, Krea generative, Depth control, VLM analyze — resolution presets only.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Changelog</h1>
      <p className="mt-2 text-muted">Image and node releases are product releases.</p>
      <ol className="mt-10 space-y-8">
        {ENTRIES.map((e) => (
          <li key={e.title} className="border-l border-border pl-4">
            <time className="font-mono text-xs text-faint">{e.date}</time>
            <h2 className="mt-1 text-base font-semibold text-fg">{e.title}</h2>
            <p className="mt-1 text-sm text-muted">{e.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
