"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/AuthProvider";
import { INSTALL } from "@/lib/constants";
import { installHref } from "@/lib/install-request";

function SendInstallLink() {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(`${window.location.origin}${INSTALL.redirectPath}`);
  }, []);

  async function copyLink() {
    const url = `${window.location.origin}${INSTALL.redirectPath}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const mailto = shareUrl
    ? `mailto:?subject=${encodeURIComponent("Install Livepeer AI Streaming in ComfyUI")}&body=${encodeURIComponent(shareUrl)}`
    : undefined;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void copyLink()}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-live px-5 py-2.5 text-sm font-semibold text-canvas hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        Send me the install link
      </button>
      <span aria-live="polite" className="text-xs text-live">
        {copied ? "Copied" : ""}
      </span>
      {mailto ? (
        <a href={mailto} className="inline-flex min-h-11 items-center text-sm text-cool hover:underline">
          Email the link
        </a>
      ) : null}
    </div>
  );
}

function AccountOrCreate({ ready, signedIn }: { ready: boolean; signedIn: boolean }) {
  if (!ready) {
    return (
      <span className="inline-flex min-h-11 min-w-36 items-center text-sm text-faint">Checking session…</span>
    );
  }
  if (signedIn) {
    return (
      <Button href="/app" variant="secondary" className="min-h-11">
        Account
      </Button>
    );
  }
  return (
    <Button href="/signup" variant="secondary" className="min-h-11">
      Create account
    </Button>
  );
}

export function HeroActions() {
  const { user, ready } = useAuth();
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
      <div className="md:hidden">
        <SendInstallLink />
      </div>
      <div className="hidden md:block">
        <Button
          href={installHref("hero")}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-11"
        >
          Install in ComfyUI
        </Button>
      </div>
      <AccountOrCreate ready={ready} signedIn={Boolean(user)} />
    </div>
  );
}

export function ClosingActions() {
  const { user, ready } = useAuth();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button
        href={installHref("hero")}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-11"
      >
        Install Livepeer AI Streaming
      </Button>
      {ready && user ? (
        <Button href="/app" variant="secondary" className="min-h-11">
          Account
        </Button>
      ) : ready ? (
        <Button href="/signup" variant="secondary" className="min-h-11">
          Create a free account
        </Button>
      ) : (
        <span className="inline-flex min-h-11 items-center text-sm text-faint">Checking session…</span>
      )}
    </div>
  );
}
