"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChartColumn,
  CircleDollarSign,
  KeyRound,
  LayoutGrid,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { MissingEmailNotice } from "@/components/MissingEmailNotice";

const NAV: { href: string; label: string; icon: LucideIcon; active: (path: string) => boolean }[] =
  [
    { href: "/app", label: "Stream", icon: Activity, active: (path) => path === "/app" },
    {
      href: "/pipelines",
      label: "Pipelines",
      icon: LayoutGrid,
      active: (path) => path.startsWith("/pipelines"),
    },
    {
      href: "/app/billing",
      label: "Billing",
      icon: CircleDollarSign,
      active: (path) => path.startsWith("/app/billing"),
    },
    {
      href: "/app/usage",
      label: "Usage",
      icon: ChartColumn,
      active: (path) => path.startsWith("/app/usage"),
    },
    {
      href: "/app/keys",
      label: "API keys",
      icon: KeyRound,
      active: (path) => path.startsWith("/app/keys"),
    },
    {
      href: "/app/settings",
      label: "Settings",
      icon: Settings,
      active: (path) => path.startsWith("/app/settings"),
    },
  ];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready, missingEmail, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user && !missingEmail) router.replace("/login");
  }, [ready, user, missingEmail, router]);

  if (!ready || (!user && !missingEmail)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (missingEmail || !user) {
    return <MissingEmailNotice />;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-12 items-center gap-2 border-b border-border px-3">
          <LogoMark size={22} />
          <span className="text-sm font-semibold">Studio</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2 text-sm">
          {NAV.map((item) => (
            <NavItem key={item.href} {...item} active={item.active(pathname)} />
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="truncate text-xs text-muted">{user.email}</p>
          <button
            type="button"
            onClick={() => {
              signOut();
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-faint hover:text-fg"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
          {NAV.map((item) => (
            <NavItem key={item.href} {...item} active={item.active(pathname)} />
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      {label}
    </Link>
  );
}
