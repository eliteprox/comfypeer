import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/Button";
import { INSTALL } from "@/lib/constants";
import { deviceLoginFromSearchParams } from "@/lib/device-login";
import { installHref } from "@/lib/install-request";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ iss?: string | string[]; target_link_uri?: string | string[] }>;
}) {
  const device = deviceLoginFromSearchParams(await searchParams);
  const returnTo = device.kind === "ready" ? device.returnTo : "/app";
  const signupHref = `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <Wordmark />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold text-fg">Create your ComfyPeer account</h1>
        <p className="mt-2 text-sm text-muted">
          Use it to sign in to {INSTALL.displayName} in ComfyUI Desktop.
        </p>
        <Button href={signupHref} className="mt-8 min-h-11 w-full">
          Create account
        </Button>
        <p className="mt-4 text-sm text-muted">
          Installing first?{" "}
          <a
            href={installHref()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cool hover:underline"
          >
            Install in ComfyUI
          </a>
        </p>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-cool hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-faint">
          Building an agent?{" "}
          <Link href="/agents" className="text-cool hover:underline">
            /agents
          </Link>
        </p>
      </div>
    </div>
  );
}
