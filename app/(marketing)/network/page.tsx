import type { Metadata } from "next";
import {
  fetchAllOrchDiscoveries,
  formatRunnerPrice,
  runnerSurfaces,
  type LiveRunner,
  type OrchDiscovery,
} from "@/lib/discovery";

export const metadata: Metadata = {
  title: "Network",
};

export const revalidate = 30;

function CapacityCell({ runner }: { runner: LiveRunner }) {
  const total = runner.capacity ?? 0;
  const available = runner.capacity_available ?? Math.max(0, total - (runner.capacity_used ?? 0));
  return (
    <span className="font-mono tabular-nums text-fg">
      {available}/{total}
    </span>
  );
}

function RunnersTable({ discovery }: { discovery: OrchDiscovery }) {
  if (discovery.error) {
    return (
      <p className="mt-3 font-mono text-xs text-billing-warn">
        discovery unreachable: {discovery.error}
      </p>
    );
  }
  if (discovery.runners.length === 0) {
    return <p className="mt-3 text-sm text-faint">No live runners advertised.</p>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-faint">
          <tr>
            <th className="px-4 py-3 font-medium">App</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Capacity</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Surfaces</th>
            <th className="px-4 py-3 font-medium">GPU</th>
          </tr>
        </thead>
        <tbody>
          {discovery.runners.map((runner) => {
            const surfaces = runnerSurfaces(runner);
            const key = `${runner.app}-${runner.url ?? ""}-${runner.gpu?.id ?? ""}`;
            return (
              <tr key={key} className="border-t border-border align-top">
                <td className="px-4 py-3 font-mono text-xs text-fg break-all">{runner.app}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  {runner.mode ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <CapacityCell runner={runner} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  {formatRunnerPrice(runner.price_info)}
                </td>
                <td className="px-4 py-3">
                  {surfaces.length === 0 ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {surfaces.map((s) => (
                        <span
                          key={s}
                          className="rounded border border-cool/30 bg-cool-dim/40 px-1.5 py-0.5 font-mono text-[11px] text-cool"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-faint">
                  {runner.gpu?.name ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function NetworkPage() {
  const discoveries = await fetchAllOrchDiscoveries();
  const orchs = discoveries.filter((d) => d.orch.url).map((d) => d.orch);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Network</h1>
      <p className="mt-2 max-w-2xl text-muted">
        How Livepeer execution works for ComfyPeer. Crypto vocabulary belongs here — not on the
        marketing hero.
      </p>

      <section className="mt-10 space-y-4 text-sm text-muted">
        <p>
          Live runners self-register with orchestrators (
          <span className="font-mono text-fg">register_runner</span>) and advertise apps. ComfyStream
          appears as app <span className="font-mono text-fg">comfystream</span> with capacity{" "}
          <span className="font-mono text-fg">1</span> (one stream per worker). Preferred time
          metric: <span className="font-mono text-fg">billable_secs</span>.
        </p>
        <p>
          Orchestrators come from the remote signer&apos;s{" "}
          <span className="font-mono text-fg">GET /discover-orchestrators</span> URL suggested on
          the SignerSession exchange (<span className="font-mono text-fg">discovery_url</span>).
        </p>
      </section>

      <h2 className="mt-10 text-base font-semibold text-fg">Orchestrators</h2>
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
            {orchs.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={3} className="px-4 py-3 text-sm text-faint">
                  No orchestrators advertised.
                </td>
              </tr>
            ) : (
              orchs.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-muted">{o.id}</td>
                  <td className="px-4 py-3 text-fg">{o.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-cool break-all">{o.url}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-base font-semibold text-fg">Live runners</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Polled from SignerSession <span className="font-mono text-fg">discovery_url</span> every
        ~30s. Capacity is available/total.
      </p>

      <div className="mt-6 space-y-8">
        {discoveries.map((d) => (
          <section key={d.orch.id}>
            <div className="flex flex-wrap items-baseline gap-3">
              <h3 className="text-sm font-medium text-fg">{d.orch.label}</h3>
              <span className="font-mono text-xs text-faint break-all">{d.orch.url}</span>
            </div>
            <RunnersTable discovery={d} />
          </section>
        ))}
      </div>
    </div>
  );
}
