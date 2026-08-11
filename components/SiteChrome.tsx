"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/Button";
import { NAV_MARKETING } from "@/lib/constants";
import { useAuth } from "@/components/AuthProvider";

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_MARKETING.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${active ? "text-fg" : "text-muted hover:text-fg"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Button href="/app" variant="primary">
              Open studio
            </Button>
          ) : (
            <>
              <Button href="/login" variant="ghost">
                Log in
              </Button>
              <Button href="/signup" variant="primary">
                Start free
              </Button>
            </>
          )}
        </div>
        <button
          type="button"
          className="rounded-md p-2 text-muted hover:bg-elevated hover:text-fg md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {NAV_MARKETING.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted hover:text-fg"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button href={user ? "/app" : "/signup"} className="mt-2 w-full">
              {user ? "Open studio" : "Start free"}
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-sm text-sm text-muted">
            One graph. Live, on-demand, or agent-driven. Billed from signed network receipts.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-fg">Product</span>
            <Link href="/pipelines" className="text-muted hover:text-fg">
              Pipelines
            </Link>
            <Link href="/pricing" className="text-muted hover:text-fg">
              Pricing
            </Link>
            <Link href="/app" className="text-muted hover:text-fg">
              Studio
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-fg">Developers</span>
            <Link href="/docs" className="text-muted hover:text-fg">
              Docs
            </Link>
            <Link href="/agents" className="text-muted hover:text-fg">
              Agents / MCP
            </Link>
            <Link href="/changelog" className="text-muted hover:text-fg">
              Changelog
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-fg">Transparency</span>
            <Link href="/network" className="text-muted hover:text-fg">
              Network
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-faint sm:px-6">
          <span>© {new Date().getFullYear()} ComfyPeer</span>
          <span className="font-mono">billable_secs</span>
        </div>
      </div>
    </footer>
  );
}
