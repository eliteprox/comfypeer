"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/Button";
import { WorkflowDownload } from "@/components/WorkflowDownload";
import { useAuth } from "@/components/AuthProvider";
import { MissingEmailNotice } from "@/components/MissingEmailNotice";
import { FIRST_RUN_WORKFLOW_ID, formatUsd, starterWorkflowById } from "@/lib/constants";
import { installHref } from "@/lib/install-request";
import type { DeviceLoginState } from "@/lib/device-login";

function ApprovalSuccess({ email, userId }: { email?: string; userId?: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [spendable, setSpendable] = useState<number | null>(null);
  const firstRun = starterWorkflowById(FIRST_RUN_WORKFLOW_ID);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetch(`/api/pymthouse/account?externalUserId=${encodeURIComponent(userId)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ spendableUsd?: string }>;
      })
      .then((data) => {
        if (cancelled || !data || data.spendableUsd == null) return;
        const amount = Number(data.spendableUsd);
        if (Number.isFinite(amount)) setSpendable(amount);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <>
      <h1
        ref={headingRef}
        tabIndex={-1}
        role="status"
        className="flex items-center gap-2 text-2xl font-semibold text-fg outline-none"
      >
        <Check className="h-6 w-6 text-live" strokeWidth={1.5} aria-hidden />
        ComfyUI is connected
      </h1>
      {email ? (
        <p className="mt-4 text-sm text-muted">
          Signed in as <span className="text-fg">{email}</span>
        </p>
      ) : null}
      {spendable != null ? (
        <p className="mt-2 text-sm text-muted">
          Balance <span className="font-mono tabular-nums text-live">{formatUsd(spendable)}</span>
        </p>
      ) : null}
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>Return to ComfyUI.</li>
        <li>
          {firstRun ? (
            <WorkflowDownload id={firstRun.id}>
              Download the first-run starter workflow ({firstRun.title})
            </WorkflowDownload>
          ) : (
            "Download the first-run starter workflow."
          )}
        </li>
        <li>
          <Link href="/app/billing" className="text-cool hover:underline">
            Add a payment method
          </Link>
        </li>
      </ol>
      <p className="mt-4 text-sm">
        <a
          href={installHref("approval")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cool hover:underline"
        >
          Install in ComfyUI
        </a>
      </p>
      <p className="mt-6 text-sm text-muted">You can close this tab.</p>
    </>
  );
}

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
            <Button href="/auth/login?returnTo=/app" className="mt-8 min-h-11 w-full">
              Log in
            </Button>
          </>
        ) : deviceReady && approved ? (
          <ApprovalSuccess email={user?.email} userId={user?.id} />
        ) : deviceReady ? (
          <>
            <h1 className="text-2xl font-semibold text-fg">Approve device sign-in</h1>
            <p className="mt-2 text-sm text-muted">
              Confirm this code matches the one on your ComfyUI machine.
            </p>
            <p className="mt-6 text-center font-mono text-3xl tracking-[0.3em] text-fg">
              {deviceReady.displayCode}
            </p>
            {user ? (
              <>
                <p className="mt-4 text-sm text-muted">
                  Signed in as <span className="text-fg">{user.email}</span>
                </p>
                {error ? (
                  <p className="mt-4 text-sm text-billing-block" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button
                  className="mt-6 min-h-11 w-full"
                  disabled={approving || !ready}
                  onClick={() => void approve()}
                >
                  {approving ? "Approving…" : "Approve and connect"}
                </Button>
              </>
            ) : (
              <Button href={authHref} className="mt-8 min-h-11 w-full" disabled={!ready}>
                {ready ? "Continue" : "Checking session…"}
              </Button>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-fg">Log in to your ComfyPeer account</h1>
            <p className="mt-2 text-sm text-muted">
              The same account signs in to Livepeer AI Streaming on the canvas.
            </p>
            <Button href={authHref} className="mt-8 min-h-11 w-full">
              Log in
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
