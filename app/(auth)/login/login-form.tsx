"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { MissingEmailNotice } from "@/components/MissingEmailNotice";
import type { DeviceLoginState } from "@/lib/device-login";

export function LoginForm({ device }: { device: DeviceLoginState }) {
  const { user, ready, missingEmail } = useAuth();
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && missingEmail) {
    return <MissingEmailNotice />;
  }

  const deviceReady = device.kind === "ready" ? device : null;
  const authHref = deviceReady
    ? `/auth/login?returnTo=${encodeURIComponent(deviceReady.returnTo)}`
    : "/auth/login?returnTo=/app";
  const signupHref = deviceReady
    ? `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(deviceReady.returnTo)}`
    : "/signup";

  async function approve() {
    if (!deviceReady) return;
    setApproving(true);
    setError(null);
    try {
      const response = await fetch("/api/pymthouse/device/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode: deviceReady.userCode }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error || "Could not approve this code");
        return;
      }
      setApproved(true);
    } catch {
      setError("Could not approve this code");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <Wordmark />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        {device.kind === "invalid" ? (
          <>
            <h1 className="text-2xl font-semibold text-fg">Sign-in link expired</h1>
            <p className="mt-2 text-sm text-muted" role="alert">
              This device link is not valid. Start sign-in again from ComfyUI.
            </p>
            <Button href="/auth/login?returnTo=/app" className="mt-8 w-full">
              Continue with Auth0
            </Button>
          </>
        ) : deviceReady ? (
          <>
            <h1 className="text-2xl font-semibold text-fg">Approve device sign-in</h1>
            <p className="mt-2 text-sm text-muted">
              Confirm this code matches the one on your ComfyUI machine.
            </p>
            <p className="mt-6 text-center font-mono text-3xl tracking-[0.3em] text-fg">
              {deviceReady.displayCode}
            </p>
            {approved ? (
              <p className="mt-6 text-sm text-muted" role="status">
                This device is signed in. You can close this window and return to ComfyUI.
              </p>
            ) : user ? (
              <>
                <p className="mt-4 text-sm text-muted">
                  Signed in as <span className="text-fg">{user.email}</span>
                </p>
                {error ? (
                  <p className="mt-4 text-sm text-billing-block" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button className="mt-6 w-full" disabled={approving || !ready} onClick={() => void approve()}>
                  {approving ? "Approving…" : "Approve and connect"}
                </Button>
              </>
            ) : (
              <Button href={authHref} className="mt-8 w-full" disabled={!ready}>
                {ready ? "Continue to approve" : "Checking session…"}
              </Button>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-fg">Log in</h1>
            <p className="mt-2 text-sm text-muted">Sign in with Auth0 to open the studio.</p>
            <Button href={authHref} className="mt-8 w-full">
              Continue with Auth0
            </Button>
          </>
        )}
        {!approved ? (
          <p className="mt-6 text-center text-sm text-muted">
            New here?{" "}
            {deviceReady ? (
              <a href={signupHref} className="text-cool hover:underline">
                Create account
              </a>
            ) : (
              <Link href={signupHref} className="text-cool hover:underline">
                Create account
              </Link>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
