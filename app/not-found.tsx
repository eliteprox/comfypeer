import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-4 text-center">
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="text-xl font-semibold text-fg">Page not found</h1>
      <Link href="/" className="text-sm text-cool hover:underline">
        Back home
      </Link>
    </div>
  );
}
