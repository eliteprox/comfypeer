"use client";

import { BillingPanel } from "@/components/BillingPanel";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";

export default function BillingPage() {
  return (
    <AppShell>
      <BillingBody />
    </AppShell>
  );
}

function BillingBody() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-4 text-xl font-semibold text-fg">Billing</h1>
      <BillingPanel externalUserId={user.id} />
    </div>
  );
}
