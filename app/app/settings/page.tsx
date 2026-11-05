"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsBody />
    </AppShell>
  );
}

function SettingsBody() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.has("topup") || params.has("checkout") || hash === "#billing") {
      router.replace(`/app/billing${window.location.search}`);
      return;
    }
    if (hash === "#keys") router.replace("/app/keys");
  }, [router]);

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-fg">Profile</h1>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4 border-b border-border py-2">
          <dt className="text-muted">Email</dt>
          <dd className="text-fg">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-border py-2">
          <dt className="text-muted">External user</dt>
          <dd className="break-all font-mono text-xs text-faint">{user.id}</dd>
        </div>
      </dl>
    </div>
  );
}
