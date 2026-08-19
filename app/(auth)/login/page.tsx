import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/Button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <Wordmark />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-semibold text-fg">Log in</h1>
        <p className="mt-2 text-sm text-muted">Sign in with Auth0 to open the studio.</p>
        <Button href="/auth/login?returnTo=/app" className="mt-8 w-full">
          Continue with Auth0
        </Button>
        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="text-cool hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
