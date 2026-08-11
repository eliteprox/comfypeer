import type { Metadata } from "next";
import { getOrchestrators } from "@/lib/orchestrators";

export const metadata: Metadata = {
  title: "Network",
};

export default function NetworkPage() {
  const orchs = getOrchestrators();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Network</h1>
      <p className="mt-2 max-w-2xl text-muted">
        How Livepeer execution works for ComfyPeer. Crypto vocabulary belongs here — not on the
        marketing hero.
      </p>

      <section className="mt-10 space-y-4 text-sm text-muted">
        <p>
          ComfyStream registers as a BYOC capability (<span className="font-mono text-fg">comfystream</span>
          ) with <span className="font-mono text-fg">CAPABILITY_CAPACITY=1</span> — one stream per
          worker. go-livepeer emits signed tickets → Kafka → OpenMeter. Preferred time metric:{" "}
          <span className="font-mono text-fg">billable_secs</span>.
        </p>
        <p>
          v1 runs on our staging orchestrators so demos are reliable. Opening the capability to
          third-party orchestrators comes after the image is stable and conformance-tested.
        </p>
      </section>

      <h2 className="mt-10 text-base font-semibold text-fg">Staging orchestrators</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-faint">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Host</th>
              <th className="px-4 py-3 font-medium">URL</th>
            </tr>
          </thead>
          <tbody>
            {orchs.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-muted">{o.id}</td>
                <td className="px-4 py-3 text-fg">{o.label}</td>
                <td className="px-4 py-3 font-mono text-xs text-cool break-all">{o.url}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
