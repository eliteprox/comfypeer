"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TimingChoice } from "@/components/TimingChoice";
import type { BillingPlan, ScheduledChangeConflict } from "@/lib/billing-plan-types";
import {
  billingPlanActionLabel,
  canCancelBillingSubscription,
  defaultCancelTimingChoice,
  deriveBillingPlanAction,
  deriveBillingSubscriptionUiState,
  formatBillingPlanPrice,
  formatPendingCancelDate,
  includedUsageFeatureLabel,
  isNothingToResumeError,
  paidCatalogPlanIds,
  resolveApplicablePendingCancel,
  resolveCancelingEffectiveAt,
  resolveCancelingPlanName,
  resolveTimingPayload,
  withCurrentPlanInDisplayList,
  type SubscriptionTimingChoice,
} from "@/lib/billing-subscription-state";
import { redirectToCheckout } from "@/lib/checkout-redirect";
import {
  includedUsageRemainingLabel,
  type IncludedUsageSummary,
} from "@/lib/included-usage";
import {
  ResumeSubscriptionError,
  ScheduledChangeConflictError,
  useBillingPlans,
} from "@/lib/useBillingPlans";

function isUsagePlan(plan: Pick<BillingPlan, "type" | "isStarterDefault">): boolean {
  if (plan.isStarterDefault) return false;
  return plan.type.trim().toLowerCase() === "usage";
}

function readCheckoutFlash(): "success" | "cancel" | null {
  const value = new URLSearchParams(window.location.search).get("checkout");
  if (value === "success" || value === "cancel") return value;
  return null;
}

function readResumePlanChange(): string | null {
  return new URLSearchParams(window.location.search).get("changePlan")?.trim() || null;
}

function clearCheckoutQuery(): void {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ["checkout", "changePlan"] as const) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function PlansPanel({
  externalUserId,
  included,
}: {
  externalUserId: string;
  included: IncludedUsageSummary | null;
}) {
  const { state, reload, subscribe, changePlan, cancelSubscription, resumeSubscription } =
    useBillingPlans(externalUserId);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelChoice, setCancelChoice] = useState<SubscriptionTimingChoice>(
    defaultCancelTimingChoice(),
  );
  const [cancelCustomDate, setCancelCustomDate] = useState("");
  const [changeDialog, setChangeDialog] = useState<{
    planId: string;
    conflict: ScheduledChangeConflict | null;
  } | null>(null);
  const [changeChoice, setChangeChoice] =
    useState<SubscriptionTimingChoice>("immediate");
  const [changeCustomDate, setChangeCustomDate] = useState("");

  useEffect(() => {
    const next = readCheckoutFlash();
    const resumePlanId = readResumePlanChange();
    if (!next && !resumePlanId) return;
    clearCheckoutQuery();
    if (next === "cancel") {
      setFlash("Checkout canceled.");
      return;
    }
    if (next !== "success") return;
    void (async () => {
      if (resumePlanId) {
        setBusyPlanId(resumePlanId);
        try {
          const result = await changePlan({
            planId: resumePlanId,
          });
          if (result.checkoutUrl) {
            redirectToCheckout(result.checkoutUrl);
            return;
          }
          setFlash("Plan updated.");
          await reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not finish plan change");
        } finally {
          setBusyPlanId(null);
        }
        return;
      }
      setFlash("Checkout completed — billing details refreshed.");
      await reload();
    })();
  }, [changePlan, reload]);

  async function runChangePlan(
    planId: string,
    timing?: {
      timing?: string;
      effectiveAt?: string;
      confirmReplaceScheduled?: boolean;
    },
  ) {
    const result = await changePlan({
      planId,
      ...timing,
    });
    if (result.checkoutUrl) {
      redirectToCheckout(result.checkoutUrl);
      return;
    }
    setFlash("Your plan has been updated.");
    await reload();
  }

  async function onPlanAction(planId: string) {
    if (state.status !== "ready") return;
    const ui = deriveBillingSubscriptionUiState(state.subscription);
    const action = deriveBillingPlanAction(ui, planId);
    setError(null);
    setBusyPlanId(planId);
    try {
      if (action === "subscribe" || action === "retry_checkout") {
        const result = await subscribe(planId);
        if (result.checkoutUrl) {
          redirectToCheckout(result.checkoutUrl);
          return;
        }
        setFlash("Plan selected.");
        await reload();
        return;
      }
      if (action === "change_plan") {
        setChangeChoice(defaultCancelTimingChoice());
        setChangeCustomDate("");
        setChangeDialog({ planId, conflict: null });
      }
    } catch (err) {
      if (err instanceof ScheduledChangeConflictError) {
        setChangeDialog({ planId, conflict: err.conflict });
        return;
      }
      setError(err instanceof Error ? err.message : "Plan update failed");
    } finally {
      setBusyPlanId(null);
    }
  }

  async function onConfirmChange() {
    if (!changeDialog) return;
    setError(null);
    setBusyPlanId(changeDialog.planId);
    try {
      await runChangePlan(changeDialog.planId, {
        ...resolveTimingPayload({
          choice: changeChoice,
          customDateYmd: changeCustomDate,
        }),
        confirmReplaceScheduled: Boolean(changeDialog.conflict),
      });
      setChangeDialog(null);
    } catch (err) {
      if (err instanceof ScheduledChangeConflictError) {
        setChangeDialog({ planId: changeDialog.planId, conflict: err.conflict });
        return;
      }
      setError(err instanceof Error ? err.message : "Could not switch plan");
    } finally {
      setBusyPlanId(null);
    }
  }

  async function onConfirmCancel() {
    setError(null);
    setLifecycleBusy(true);
    try {
      await cancelSubscription(
        resolveTimingPayload({
          choice: cancelChoice,
          customDateYmd: cancelCustomDate,
        }),
      );
      setCancelOpen(false);
      setFlash("Subscription canceled.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setLifecycleBusy(false);
    }
  }

  async function onResume() {
    setError(null);
    setLifecycleBusy(true);
    try {
      await resumeSubscription();
      setFlash("Plan restored.");
      await reload();
    } catch (err) {
      if (err instanceof ResumeSubscriptionError && isNothingToResumeError(err.code)) {
        await reload();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not restore plan");
    } finally {
      setLifecycleBusy(false);
    }
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="animate-pulse rounded-lg border border-border bg-surface p-5">
        <div className="h-4 w-28 rounded bg-elevated" />
        <div className="mt-4 h-20 rounded bg-elevated" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="text-sm text-muted">Could not load plans.</p>
        <p className="mt-1 font-mono text-xs text-faint">{state.message}</p>
        <Button className="mt-3" variant="secondary" onClick={() => void reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const subscription = state.subscription;
  const plans = withCurrentPlanInDisplayList(state.plans, subscription) as BillingPlan[];
  const ui = deriveBillingSubscriptionUiState(subscription);
  const canCancel = canCancelBillingSubscription(
    ui,
    paidCatalogPlanIds(state.plans),
    true,
  );
  const canResume = Boolean(resolveApplicablePendingCancel(subscription));
  const cancelingName = resolveCancelingPlanName(subscription);
  const cancelingEnds = formatPendingCancelDate(resolveCancelingEffectiveAt(subscription));

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Plan</h3>
          <p className="mt-1 text-sm text-muted">
            {included
              ? includedUsageRemainingLabel(included)
              : subscription?.planName?.trim() || "Choose a plan"}
          </p>
        </div>
        {canCancel ? (
          <button
            type="button"
            className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-50"
            disabled={lifecycleBusy || busyPlanId !== null}
            onClick={() => {
              setCancelChoice(defaultCancelTimingChoice());
              setCancelCustomDate("");
              setCancelOpen(true);
            }}
          >
            Cancel subscription
          </button>
        ) : canResume ? (
          <button
            type="button"
            className="text-xs text-live underline-offset-2 hover:underline disabled:opacity-50"
            disabled={lifecycleBusy}
            onClick={() => void onResume()}
          >
            {lifecycleBusy ? "Restoring…" : "Restore plan"}
          </button>
        ) : null}
      </div>

      {flash ? (
        <p className="mt-3 text-sm text-live" role="status">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-billing-block" role="alert">
          {error}
        </p>
      ) : null}

      {ui.kind === "canceling" ? (
        <p className="mt-3 text-sm text-muted">
          {cancelingName} stays active until {cancelingEnds}. Switching to another plan
          replaces this remaining period.
        </p>
      ) : null}

      {cancelOpen ? (
        <div className="mt-4">
          <TimingChoice
            title="Cancel subscription"
            description="Choose when the paid plan should end. Starter remains the floor."
            options={subscription?.timingOptions?.cancel}
            choice={cancelChoice}
            customDate={cancelCustomDate}
            confirmLabel="Confirm cancel"
            busy={lifecycleBusy}
            onChoice={setCancelChoice}
            onCustomDate={setCancelCustomDate}
            onConfirm={() => void onConfirmCancel()}
            onClose={() => setCancelOpen(false)}
          />
        </div>
      ) : null}

      {changeDialog ? (
        <div className="mt-4">
          <TimingChoice
            title={
              changeDialog.conflict
                ? "Replace scheduled plan change"
                : "Switch plan"
            }
            description={
              changeDialog.conflict
                ? changeDialog.conflict.error
                : "Choose when the new plan should start."
            }
            options={
              changeDialog.conflict?.timingOptions ??
              subscription?.timingOptions?.change
            }
            choice={changeChoice}
            customDate={changeCustomDate}
            confirmLabel="Confirm switch"
            busy={busyPlanId !== null}
            onChoice={setChangeChoice}
            onCustomDate={setChangeCustomDate}
            onConfirm={() => void onConfirmChange()}
            onClose={() => setChangeDialog(null)}
          />
        </div>
      ) : null}

      {plans.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No plans are published for this app yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {plans.map((plan) => {
            const action = deriveBillingPlanAction(ui, plan.id);
            const isCurrent = action === "current";
            const { price, priceSub } = formatBillingPlanPrice(plan);
            const remaining =
              isCurrent && included
                ? `$${included.remainingUsd} of $${included.totalUsd} included left`
                : includedUsageFeatureLabel(plan);
            return (
              <li
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-fg">{plan.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-faint">
                    {price}
                    {priceSub}
                    {plan.capabilityCount > 0
                      ? ` · ${plan.capabilityCount} capabilities`
                      : ""}
                  </p>
                  {remaining ? (
                    <p className="mt-1 text-xs text-muted">{remaining}</p>
                  ) : null}
                  {isUsagePlan(plan) ? (
                    <p className="mt-1 text-xs text-faint">
                      {plan.resolvedBehavior?.trim() ||
                        "Usage draws down included usage first, then prepaid credits, then invoices."}
                    </p>
                  ) : null}
                </div>
                {isCurrent ? (
                  <span className="rounded-md border border-border px-2.5 py-1 text-xs text-muted">
                    Current plan
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    disabled={busyPlanId !== null}
                    onClick={() => void onPlanAction(plan.id)}
                  >
                    {busyPlanId === plan.id
                      ? "Working…"
                      : billingPlanActionLabel(action, {
                          usagePlan: isUsagePlan(plan),
                          starterPlan: plan.isStarterDefault,
                        })}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
