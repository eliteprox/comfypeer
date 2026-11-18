function GraphNode({ label, live = false }: { label: string; live?: boolean }) {
  return (
    <div
      className={`rounded-md border px-3 py-3 text-center font-mono text-xs ${
        live ? "border-live text-live" : "border-cool/40 bg-cool-dim/30 text-cool"
      }`}
    >
      {label}
    </div>
  );
}

function GraphEdge() {
  return <span aria-hidden className="h-px w-8 bg-cool sm:h-px" />;
}

/** Static stand-in. A recorded canvas replaces this frame later. */
export function HeroDiagram() {
  return (
    <figure className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <GraphNode label="TrickleFrameInput" />
        <GraphEdge />
        <GraphNode label="Start" live />
        <GraphEdge />
        <GraphNode label="TrickleFrameOutput" />
      </div>
      <figcaption className="mt-4 text-center text-xs text-faint">
        Diagram of a starter graph. A recorded canvas will replace this frame.
      </figcaption>
    </figure>
  );
}
