"use client";

import { useState } from "react";

export function CopyText({
  value,
  label,
  mono = false,
}: {
  value: string;
  label: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <span className="text-xs text-faint">{label}</span>
      <code className={`min-w-0 flex-1 break-all text-sm text-fg ${mono ? "font-mono" : ""}`}>
        {value}
      </code>
      <button
        type="button"
        onClick={() => void onCopy()}
        className="inline-flex min-h-11 items-center rounded-md border border-border-strong px-3 text-sm text-fg hover:bg-elevated focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        Copy
      </button>
      <span aria-live="polite" className="min-w-14 text-xs text-live">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
