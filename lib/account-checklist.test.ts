import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { measuredDesktopRateUsdPerSec } from "./constants";
import { accountChecklist, creditRunwayMinutes } from "./account-checklist";

describe("accountChecklist", () => {
  it("lists the four derived items and leaves a new account open", () => {
    const result = accountChecklist({
      userPresent: true,
      spendableUsd: 0,
      requestCount: 0,
      autoTopUp: false,
    });
    assert.equal(result.collapsed, false);
    assert.deepEqual(
      result.items.map((item) => item.id),
      ["account", "credit", "first-stream", "auto-topup"],
    );
    assert.deepEqual(
      result.items.map((item) => item.done),
      [true, false, false, false],
    );
  });

  it("marks credit and auto top-up only from real values", () => {
    const result = accountChecklist({
      userPresent: true,
      spendableUsd: 1.5,
      requestCount: 0,
      autoTopUp: true,
    });
    assert.equal(result.items.find((item) => item.id === "credit")?.done, true);
    assert.equal(result.items.find((item) => item.id === "auto-topup")?.done, true);
    assert.equal(result.collapsed, false);
  });

  it("does not treat a missing balance or usage feed as done", () => {
    const result = accountChecklist({
      userPresent: false,
      spendableUsd: null,
      requestCount: null,
      autoTopUp: null,
    });
    assert.equal(result.collapsed, false);
    assert.deepEqual(
      result.items.map((item) => item.done),
      [false, false, false, false],
    );
  });

  it("collapses once a first stream exists", () => {
    const result = accountChecklist({
      userPresent: true,
      spendableUsd: 2,
      requestCount: 3,
      autoTopUp: false,
    });
    assert.equal(result.collapsed, true);
    assert.equal(result.items.find((item) => item.id === "first-stream")?.done, true);
  });
});

describe("creditRunwayMinutes", () => {
  it("computes minutes from a measured rate", () => {
    assert.equal(creditRunwayMinutes(0.06, 0.001), 1);
  });

  it("skips the sentence when spendable or the Desktop rate is missing", () => {
    assert.equal(creditRunwayMinutes(0, 0.001), null);
    assert.equal(creditRunwayMinutes(10, null), null);
    assert.equal(creditRunwayMinutes(10, 0), null);
    assert.equal(creditRunwayMinutes(10, measuredDesktopRateUsdPerSec()), null);
  });
});
