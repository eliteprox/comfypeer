import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { authLogoutHref, publicNextUrl } from "./app-url";

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (ORIGINAL_APP_URL === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
  }
});

describe("publicNextUrl", () => {
  it("uses NEXT_PUBLIC_APP_URL without a trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://comfypeer.example/";
    assert.equal(publicNextUrl(), "https://comfypeer.example");
  });
});

describe("authLogoutHref", () => {
  it("sets returnTo to the public origin so Auth0 gets post_logout_redirect_uri", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://comfypeer.example";
    assert.equal(
      authLogoutHref(),
      "/auth/logout?returnTo=https%3A%2F%2Fcomfypeer.example",
    );
  });
});
