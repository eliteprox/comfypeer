import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  includedUsageRemainingLabel,
  includedUsageSummary,
} from "./included-usage";

describe("includedUsageSummary", () => {
  it("returns null without an included allowance", () => {
    assert.equal(
      includedUsageSummary({
        funding: {
          included: { usdMicros: "0", usd: "0.00" },
          includedUsage: {
            total: { usdMicros: "0", usd: "0.00" },
            remaining: { usdMicros: "0", usd: "0.00" },
            consumed: { usdMicros: "0", usd: "0.00" },
          },
        },
      }),
      null,
    );
  });

  it("names the live plan and remaining included usage", () => {
    const summary = includedUsageSummary({
      funding: {
        included: { usdMicros: "4982000", usd: "4.98" },
        includedUsage: {
          total: { usdMicros: "5000000", usd: "5.00" },
          remaining: { usdMicros: "4982000", usd: "4.98" },
          consumed: { usdMicros: "18000", usd: "0.02" },
          resetsAt: "2026-09-01T00:00:00.000Z",
          sourcePlan: { id: "plan_1", name: "Starter", type: "free" },
        },
      },
    });
    assert.ok(summary);
    assert.equal(summary.planName, "Starter");
    assert.equal(summary.remainingUsd, "4.98");
    assert.equal(summary.totalUsd, "5.00");
    assert.equal(
      includedUsageRemainingLabel(summary),
      "Starter · $4.98 of $5.00 included left",
    );
  });
});
