"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";

export default function ApiKeysPage() {
  return (
    <AppShell>
      <KeysBody />
    </AppShell>
  );
}

function KeysBody() {
  const { user } = useAuth();
  const [keyBusy, setKeyBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ apiKey?: string; sdkToken?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function mintKey() {
    setKeyBusy(true);
    setError(null);
    setRevealed(null);
    try {
      const res = await fetch("/api/pymthouse/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalUserId: user!.id }),
      });
      const data = (await res.json()) as {
        apiKey?: string;
        sdkToken?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to mint key");
      setRevealed({ apiKey: data.apiKey, sdkToken: data.sdkToken });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mint key");
    } finally {
      setKeyBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-fg">API keys</h1>
      <p className="mt-1 text-sm text-muted">
        Secrets shown once. Keys are hashed at rest — we cannot recover them.
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void mintKey()}
        disabled={keyBusy}
        className="mt-4"
      >
        {keyBusy ? "Minting…" : "Mint API key"}
      </Button>
      {revealed ? (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4">
          {revealed.apiKey ? (
            <div>
              <p className="text-xs text-muted">API key (usage / REST)</p>
              <code className="mt-1 block break-all font-mono text-xs text-live">{revealed.apiKey}</code>
            </div>
          ) : null}
          {revealed.sdkToken ? (
            <div>
              <p className="text-xs text-muted">SDK token (signer / webhooks)</p>
              <code className="mt-1 block break-all font-mono text-xs text-cool">
                {revealed.sdkToken}
              </code>
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-billing-block">
          {error}
        </p>
      ) : null}
    </div>
  );
}
