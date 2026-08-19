import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/Button";

export default function SignupPage() {
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
        <div className="mt-8 rounded-md border border-border bg-surface p-3 text-sm text-muted">
          <p className="font-medium text-fg">Verify you&apos;re human</p>
          <p className="mt-1 text-xs">
            Slot reserved — verification method TBD (card-on-file / GitHub age / phone). Agents
            cannot use this path for free credit.
          </p>
        </div>
        <Button href="/auth/login?screen_hint=signup&returnTo=/app" className="mt-6 w-full">
          Start free — $5 of compute
        </Button>
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
