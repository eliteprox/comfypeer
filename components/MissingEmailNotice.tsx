"use client";

import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";

/** Full-page notice when Auth0 signed in but the profile has no email claim. */
export function MissingEmailNotice() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <Wordmark />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold text-fg">Email required</h1>
        <p className="mt-2 text-sm text-muted">
          Your Auth0 account must share an email to use ComfyPeer. Sign out and try another
          account, or enable email on that login provider.
        </p>
        <Button type="button" onClick={() => signOut()} className="mt-8 w-full">
          Sign out
        </Button>
      </div>
    </div>
  );
}
