import "server-only";

import {
  PmtHouseError,
  type BillingProduct,
  type CreateBillingCheckoutResult,
  type UserSubscriptionResponse,
} from "@pymthouse/builder-sdk";
import { appBaseUrl } from "@/lib/app-url";
import type {
  BillingPlan,
  ScheduledChangeConflict,
  SubscriptionChange,
  UserSubscription,
} from "@/lib/billing-plan-types";
import {
  createPmtHouseClient,
  pymthouseAppsOrigin,
  pymthouseM2mAuthHeader,
  readPublicClientId,
} from "@/lib/pymthouse";

export type {
  BillingPlan,
  ScheduledChangeConflict,
  SubscriptionChange,
  UserSubscription,
} from "@/lib/billing-plan-types";

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapProduct(product: BillingProduct): BillingPlan {
  const dynamicProduct = product as BillingProduct & {
    chargeThresholdUsdMicros?: unknown;
    resolvedBehavior?: unknown;
  };
  const isStarterDefault = product.isStarterDefault === true;
  const name = isStarterDefault
    ? "Starter"
    : product.name?.trim() || product.id;

  return {
    id: product.id,
    name,
    type: isStarterDefault ? "free" : product.type,
    status: product.status,
    priceAmount: product.priceAmount,
    priceCurrency: product.priceCurrency,
    billingCycle: product.allowance?.billingCycle ?? null,
    includedUsdMicros: readOptionalString(product.allowance?.includedUsdMicros),
    chargeThresholdUsdMicros: isStarterDefault
      ? null
      : readOptionalString(dynamicProduct.chargeThresholdUsdMicros),
    resolvedBehavior: isStarterDefault
      ? null
      : readOptionalString(dynamicProduct.resolvedBehavior),
    capabilityCount: product.capabilities?.length ?? 0,
    isStarterDefault,
  };
}

export async function listBillingPlans(): Promise<BillingPlan[]> {
  const client = createPmtHouseClient();
  const { products } = await client.listBillingProducts();
  return (products ?? [])
    .filter((p) => p.status === "active" && !p.isNetworkDefault)
    .map(mapProduct)
    .sort((a, b) => Number(b.isStarterDefault) - Number(a.isStarterDefault));
}

export async function startBillingCheckout(input: {
  planId: string;
  externalUserId: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CreateBillingCheckoutResult> {
  const client = createPmtHouseClient();
  return client.createBillingCheckout({
    planId: input.planId,
    externalUserId: input.externalUserId,
    ...(input.successUrl ? { successUrl: input.successUrl } : {}),
    ...(input.cancelUrl ? { cancelUrl: input.cancelUrl } : {}),
  });
}

async function readPymthouseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: (T & { error?: string }) | null = null;
  try {
    body = text ? (JSON.parse(text) as T & { error?: string }) : null;
  } catch {
    throw new PmtHouseError(`PymtHouse returned non-JSON (${response.status})`, {
      status: 502,
      code: "invalid_json",
    });
  }
  if (!response.ok) {
    throw new PmtHouseError(body?.error ?? `Request failed (${response.status})`, {
      status: response.status,
      code: "subscription_change_failed",
      details: body ?? undefined,
    });
  }
  if (!body) {
    throw new PmtHouseError("PymtHouse returned an empty response", {
      status: 502,
      code: "invalid_response",
    });
  }
  return body;
}

export async function changeBillingSubscription(input: {
  planId: string;
  externalUserId: string;
  successUrl?: string;
  cancelUrl?: string;
  timing?: string;
  effectiveAt?: string;
  confirmReplaceScheduled?: boolean;
}): Promise<SubscriptionChange> {
  const publicClientId = readPublicClientId();
  const response = await fetch(
    `${pymthouseAppsOrigin()}/api/v1/apps/${encodeURIComponent(publicClientId)}/users/${encodeURIComponent(input.externalUserId)}/subscription/change`,
    {
      method: "POST",
      headers: {
        Authorization: pymthouseM2mAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId: input.planId,
        ...(input.successUrl ? { successUrl: input.successUrl } : {}),
        ...(input.cancelUrl ? { cancelUrl: input.cancelUrl } : {}),
        ...(input.timing ? { timing: input.timing } : {}),
        ...(input.effectiveAt ? { effectiveAt: input.effectiveAt } : {}),
        ...(input.confirmReplaceScheduled
          ? { confirmReplaceScheduled: true }
          : {}),
      }),
      cache: "no-store",
    },
  );
  if (response.status === 409) {
    const text = await response.text();
    let body: ScheduledChangeConflict | null = null;
    try {
      body = text ? (JSON.parse(text) as ScheduledChangeConflict) : null;
    } catch {
      body = null;
    }
    if (body?.code === "scheduled_change_exists") {
      throw new PmtHouseError(body.error || "Scheduled plan change exists", {
        status: 409,
        code: "scheduled_change_exists",
        details: body,
      });
    }
  }
  return readPymthouseResponse<SubscriptionChange>(response);
}

export async function getUserSubscription(
  externalUserId: string,
): Promise<UserSubscription> {
  const client = createPmtHouseClient();
  const result: UserSubscriptionResponse =
    await client.getUserSubscription(externalUserId);
  const sub = result.subscription;
  const pending = result.pendingCancel ?? null;
  return {
    planId: sub?.planId?.trim() || pending?.planId?.trim() || null,
    planName: sub?.planName?.trim() || pending?.planName?.trim() || null,
    status: sub?.status?.trim() || (pending ? "canceled" : null),
    subscriptionId: sub?.id?.trim() || pending?.subscriptionId?.trim() || null,
    currentPeriodEnd:
      sub?.currentPeriodEnd?.trim() || pending?.effectiveAt?.trim() || null,
    timingOptions: result.timingOptions ?? null,
    pendingCancel: pending
      ? {
          subscriptionId: pending.subscriptionId,
          planId: pending.planId,
          planKey: pending.planKey,
          planName: pending.planName,
          effectiveAt: pending.effectiveAt,
        }
      : null,
  };
}

export async function cancelUserSubscription(
  externalUserId: string,
  opts?: { timing?: string; effectiveAt?: string },
): Promise<void> {
  const client = createPmtHouseClient();
  await client.cancelUserSubscription(externalUserId, {
    confirm: true,
    ...(opts?.timing ? { timing: opts.timing } : {}),
    ...(opts?.effectiveAt ? { effectiveAt: opts.effectiveAt } : {}),
  });
}

export async function resumeUserSubscription(
  externalUserId: string,
): Promise<void> {
  const client = createPmtHouseClient();
  await client.resumeUserSubscription(externalUserId, { confirm: true });
}

export function settingsCheckoutUrls(planId?: string): {
  successUrl: string;
  cancelUrl: string;
} {
  const origin = appBaseUrl().replace(/\/$/, "");
  const change = planId
    ? `&changePlan=${encodeURIComponent(planId)}`
    : "";
  return {
    successUrl: `${origin}/app/settings?checkout=success${change}`,
    cancelUrl: `${origin}/app/settings?checkout=cancel`,
  };
}
