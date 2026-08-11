"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const [keyBusy, setKeyBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ apiKey?: string; sdkToken?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topUpBusy, setTopUpBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        Loading…
      </div>
    );
  }

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

  async function topUp() {
    setTopUpBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pymthouse/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalUserId: user!.id, amountUsd: 10 }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Top-up failed");
      const checkoutUrl = data.url?.trim();
      if (!checkoutUrl) {
        setError("No checkout URL returned — Connect may not be ready.");
        return;
      }
      let parsed: URL;
      try {
        parsed = new URL(checkoutUrl);
      } catch {
        setError("Invalid checkout URL.");
        return;
      }
      const allowedHost =
        parsed.protocol === "https:" &&
        (parsed.hostname === "checkout.stripe.com" ||
          parsed.hostname.endsWith(".stripe.com"));
      if (!allowedHost) {
        setError("Checkout URL host is not allowed.");
        return;
      }
      window.location.assign(parsed.toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setTopUpBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-12 items-center gap-3 border-b border-border px-4">
        <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold">
          <LogoMark size={22} /> Settings
        </Link>
      </header>
      <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
        <section>
          <h1 className="text-xl font-semibold text-fg">Profile</h1>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted">Email</dt>
              <dd className="text-fg">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted">External user</dt>
              <dd className="font-mono text-xs text-faint break-all">{user.id}</dd>
            </div>
          </dl>
        </section>

        <section id="billing">
          <h2 className="text-lg font-semibold text-fg">Billing</h2>
          <p className="mt-1 text-sm text-muted">
            Prepaid top-up via PymtHouse Stripe Checkout ($1–$10,000).
          </p>
          <Button
            type="button"
            onClick={() => void topUp()}
            disabled={topUpBusy}
            className="mt-4"
          >
            {topUpBusy ? "Starting…" : "Add $10 credit"}
          </Button>
        </section>

        <section id="keys">
          <h2 className="text-lg font-semibold text-fg">API keys</h2>
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
                  <code className="mt-1 block break-all font-mono text-xs text-live">
                    {revealed.apiKey}
                  </code>
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
        </section>

        {error ? (
          <p role="alert" className="text-sm text-billing-block">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="text-sm text-muted hover:text-fg"
          onClick={() => {
            signOut();
            router.push("/");
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
