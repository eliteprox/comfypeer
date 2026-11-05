import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDeviceLoginQuery } from "./device-login";

const ISSUER = "https://pymthouse.com/api/v1/oidc";
const CLIENT_ID = "app_444013b9d984f62f5572a282";
const TARGET =
  "https://pymthouse.com/oidc/device?user_code=CNKM-SWZQ&client_id=app_444013b9d984f62f5572a282&iss=https%3A%2F%2Fpymthouse.com%2Fapi%2Fv1%2Foidc";

const expected = { issuer: ISSUER, publicClientId: CLIENT_ID };

describe("parseDeviceLoginQuery", () => {
  it("accepts the ComfyPeer initiate-login URL and stays on /login", () => {
    const ready = parseDeviceLoginQuery({ iss: ISSUER, targetLinkUri: TARGET }, expected);
    assert.ok(ready);
    assert.equal(ready.displayCode, "CNKM-SWZQ");
    assert.equal(ready.userCode, "CNKMSWZQ");
    assert.equal(ready.returnTo.startsWith("/login?"), true);
    assert.equal(decodeURIComponent(ready.returnTo).includes("https://pymthouse.com/oidc/device"), true);
    assert.equal(ready.returnTo.startsWith("http"), false);
  });

  it("rejects a target on another origin", () => {
    const evil = TARGET.replace("https://pymthouse.com/oidc/device", "https://evil.example/oidc/device");
    assert.equal(parseDeviceLoginQuery({ iss: ISSUER, targetLinkUri: evil }, expected), null);
  });

  it("rejects a mismatched client or issuer", () => {
    const otherClient = TARGET.replace(CLIENT_ID, "app_other");
    assert.equal(
      parseDeviceLoginQuery({ iss: ISSUER, targetLinkUri: otherClient }, expected),
      null,
    );
    assert.equal(
      parseDeviceLoginQuery(
        { iss: "https://staging.pymthouse.com/api/v1/oidc", targetLinkUri: TARGET },
        expected,
      ),
      null,
    );
  });
});
