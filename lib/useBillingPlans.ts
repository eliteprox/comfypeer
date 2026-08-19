"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BillingPlan,
  ScheduledChangeConflict,
  UserSubscription,
} from "@/lib/billing-plan-types";

export type BillingPlansState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; plans: BillingPlan[]; subscription: UserSubscription | null }
  | { status: "error"; message: string };

export class ScheduledChangeConflictError extends Error {
  readonly code = "scheduled_change_exists" as const;
  readonly conflict: ScheduledChangeConflict;

  constructor(conflict: ScheduledChangeConflict) {
    super(conflict.error || "A plan change is already scheduled");
    this.name = "ScheduledChangeConflictError";
    this.conflict = conflict;
  }
}

export class ResumeSubscriptionError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code: string | undefined) {
    super(message);
    this.name = "ResumeSubscriptionError";
    this.status = status;
    this.code = code;
  }
}

async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) throw new Error(`Empty response (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON (${response.status})`);
  }
}

export function useBillingPlans(externalUserId: string) {
  const [state, setState] = useState<BillingPlansState>({ status: "idle" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const plansResponse = await fetch("/api/pymthouse/plans");
      const plansBody = await readResponseJson<{
        plans?: BillingPlan[];
        error?: string;
      }>(plansResponse);
      if (!plansResponse.ok) {
        throw new Error(plansBody.error ?? `Plans fetch failed (${plansResponse.status})`);
      }

      let subscription: UserSubscription | null = null;
      const subResponse = await fetch(
        `/api/pymthouse/subscription?externalUserId=${encodeURIComponent(externalUserId)}`,
      );
      const subBody = await readResponseJson<{
        subscription?: UserSubscription;
        error?: string;
      }>(subResponse);
      if (subResponse.ok) {
        subscription = subBody.subscription ?? null;
      }

      setState({
        status: "ready",
        plans: plansBody.plans ?? [],
        subscription,
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load plans",
      });
    }
  }, [externalUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const subscribe = useCallback(
    async (planId: string) => {
      const response = await fetch("/api/pymthouse/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, externalUserId }),
      });
      const body = await readResponseJson<{
        checkoutUrl?: string;
        error?: string;
      }>(response);
      if (!response.ok) {
        throw new Error(body.error ?? `Subscribe failed (${response.status})`);
      }
      return { checkoutUrl: body.checkoutUrl };
    },
    [externalUserId],
  );

  const changePlan = useCallback(
    async (input: {
      planId: string;
      timing?: string;
      effectiveAt?: string;
      confirmReplaceScheduled?: boolean;
    }) => {
      const response = await fetch("/api/pymthouse/subscription/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: input.planId,
          externalUserId,
          timing: input.timing,
          effectiveAt: input.effectiveAt,
          confirmReplaceScheduled: input.confirmReplaceScheduled,
        }),
      });
      const body = await readResponseJson<{
        checkoutUrl?: string;
        error?: string;
        code?: string;
        timingOptions?: ScheduledChangeConflict["timingOptions"];
        scheduledSubscriptionId?: string | null;
        scheduledPlanKey?: string | null;
        scheduledActiveFrom?: string | null;
      }>(response);
      if (response.status === 409 && body.code === "scheduled_change_exists") {
        throw new ScheduledChangeConflictError({
          code: "scheduled_change_exists",
          error: body.error ?? "A plan change is already scheduled",
          timingOptions: body.timingOptions ?? null,
          scheduledSubscriptionId: body.scheduledSubscriptionId ?? null,
          scheduledPlanKey: body.scheduledPlanKey ?? null,
          scheduledActiveFrom: body.scheduledActiveFrom ?? null,
        });
      }
      if (!response.ok) {
        throw new Error(body.error ?? `Plan change failed (${response.status})`);
      }
      return { checkoutUrl: body.checkoutUrl };
    },
    [externalUserId],
  );

  const cancelSubscription = useCallback(
    async (opts?: { timing?: string; effectiveAt?: string }) => {
      const response = await fetch("/api/pymthouse/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalUserId,
          ...(opts?.timing ? { timing: opts.timing } : {}),
          ...(opts?.effectiveAt ? { effectiveAt: opts.effectiveAt } : {}),
        }),
      });
      const body = await readResponseJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(body.error ?? `Cancel failed (${response.status})`);
      }
    },
    [externalUserId],
  );

  const resumeSubscription = useCallback(async () => {
    const response = await fetch("/api/pymthouse/subscription/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalUserId }),
    });
    const body = await readResponseJson<{ error?: string; code?: string }>(response);
    if (!response.ok) {
      throw new ResumeSubscriptionError(
        body.error ?? `Resume failed (${response.status})`,
        response.status,
        body.code,
      );
    }
  }, [externalUserId]);

  return {
    state,
    reload: load,
    subscribe,
    changePlan,
    cancelSubscription,
    resumeSubscription,
  };
}
