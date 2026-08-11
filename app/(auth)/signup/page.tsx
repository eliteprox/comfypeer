"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, name);
      router.push("/app");
    } catch {
      setError("Could not create account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <Wordmark />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold text-fg">Create account</h1>
        <p className="mt-2 text-sm text-muted">
          Human path to free credit. Agents must prepay — use{" "}
          <Link href="/agents" className="text-cool hover:underline">
            /agents
          </Link>
          .
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2 text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-elevated px-3 py-2 text-fg outline-none focus-visible:ring-1 focus-visible:ring-live/30"
              autoComplete="email"
            />
          </label>

          <div className="rounded-md border border-border bg-surface p-3 text-sm text-muted">
            <p className="font-medium text-fg">Verify you&apos;re human</p>
            <p className="mt-1 text-xs">
              Slot reserved — verification method TBD (card-on-file / GitHub age / phone). Agents
              cannot use this path for free credit.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-billing-block">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Start free — $5 of compute"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-cool hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
