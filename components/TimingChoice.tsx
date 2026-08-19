"use client";

import { Button } from "@/components/Button";
import {
  formatPendingCancelDate,
  toDateInputValue,
  type SubscriptionTimingChoice,
  type SubscriptionTimingOptions,
} from "@/lib/billing-subscription-state";

export function TimingChoice({
  title,
  description,
  options,
  choice,
  customDate,
  confirmLabel,
  busy,
  onChoice,
  onCustomDate,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  options: SubscriptionTimingOptions | null | undefined;
  choice: SubscriptionTimingChoice;
  customDate: string;
  confirmLabel: string;
  busy: boolean;
  onChoice: (choice: SubscriptionTimingChoice) => void;
  onCustomDate: (ymd: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const min = toDateInputValue(options?.minEffectiveAt);
  const max = toDateInputValue(options?.maxEffectiveAt);
  return (
    <div className="rounded-lg border border-border bg-elevated p-4">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-3 space-y-2">
        {(
          [
            {
              id: "immediate" as const,
              label: "Immediately",
              hint: "Takes effect right away",
            },
            {
              id: "next_billing_cycle" as const,
              label: "End of current period",
              hint: options?.maxEffectiveAt
                ? formatPendingCancelDate(options.maxEffectiveAt)
                : "Keep access until the period ends",
            },
            {
              id: "custom" as const,
              label: "Pick a date",
              hint: min && max ? `${min} – ${max}` : "Choose a date in range",
            },
          ] as const
        ).map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2 hover:border-border-strong"
          >
            <input
              type="radio"
              className="mt-1"
              name="timing-choice"
              checked={choice === opt.id}
              onChange={() => onChoice(opt.id)}
            />
            <span>
              <span className="block text-sm font-medium text-fg">{opt.label}</span>
              <span className="block text-xs text-muted">{opt.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {choice === "custom" ? (
        <input
          type="date"
          className="mt-3 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-fg"
          min={min || undefined}
          max={max || undefined}
          value={customDate}
          onChange={(e) => onCustomDate(e.target.value)}
        />
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Working…" : confirmLabel}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
