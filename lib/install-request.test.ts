import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INSTALL } from "./constants";
import { deviceClassFromClientHint, installHref, installSourceFromQuery } from "./install-request";

describe("installSourceFromQuery", () => {
  it("keeps the known sources and drops anything else", () => {
    assert.equal(installSourceFromQuery("hero"), "hero");
    assert.equal(installSourceFromQuery("footer"), "footer");
    assert.equal(installSourceFromQuery("signup"), undefined);
    assert.equal(installSourceFromQuery(null), undefined);
  });
});

describe("deviceClassFromClientHint", () => {
  it("maps the mobile client hint and treats every other value as desktop", () => {
    assert.equal(deviceClassFromClientHint("?1"), "mobile");
    assert.equal(deviceClassFromClientHint(" ?1 "), "mobile");
    assert.equal(deviceClassFromClientHint("?0"), "desktop");
    assert.equal(deviceClassFromClientHint(null), "desktop");
  });
});

describe("installHref", () => {
  it("points at the install redirect and appends a source when given", () => {
    assert.equal(installHref(), INSTALL.redirectPath);
    assert.equal(installHref("header"), `${INSTALL.redirectPath}?source=header`);
  });
});
