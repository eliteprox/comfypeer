import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
};

const ENTRIES = [
  {
    date: "2026-11-17",
    title: "ComfyPeer is the account for Livepeer AI Streaming",
    body: "The site is the account, billing, and install path for Livepeer AI Streaming in ComfyUI Desktop. Nodes 1.1.0 are in progress. This change does not publish the package to the registry.",
  },
  {
    date: "2026-08-11",
    title: "ComfyPeer v0.1 — staging launch",
    body: "Marketing site, studio shell, PymtHouse staging wiring, three liverunner orchestrators on :8936.",
  },
  {
    date: "2026-08-11",
    title: "Web studio catalog",
    body: "The web studio lists Video/Audio Passthrough and Inverted Color as available. StreamDiffusion img2img and Depth control remain coming. Desktop remote models are a separate list and are not yet measured.",
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
