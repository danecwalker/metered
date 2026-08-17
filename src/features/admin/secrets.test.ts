import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXAMPLE_ADMIN_SECRETS,
  MIN_ADMIN_PASSWORD_LENGTH,
  MIN_ADMIN_SECRET_LENGTH,
  adminUnconfiguredMessage,
  inspectAdminSecrets,
  isExampleAdminSecret,
  resolveAdminSecrets,
} from "./secrets";

const usable = {
  ADMIN_PASSWORD: "correct-horse",
  ADMIN_SECRET: "a-sufficiently-long-random-secret",
};

describe("isExampleAdminSecret", () => {
  it("matches documented placeholders, ignoring case and padding", () => {
    for (const value of EXAMPLE_ADMIN_SECRETS) {
      assert.equal(isExampleAdminSecret(value), true);
      assert.equal(isExampleAdminSecret(` ${value.toUpperCase()} `), true);
    }
    assert.equal(isExampleAdminSecret("not-an-example"), false);
  });
});

describe("inspectAdminSecrets", () => {
  it("treats a missing password or secret as not configured", () => {
    assert.deepEqual(inspectAdminSecrets({}), { ok: false, reason: "missing" });
    assert.deepEqual(inspectAdminSecrets({ ADMIN_PASSWORD: "local-dev" }), {
      ok: false,
      reason: "missing",
    });
    assert.deepEqual(inspectAdminSecrets({ ADMIN_SECRET: usable.ADMIN_SECRET }), {
      ok: false,
      reason: "missing",
    });
    assert.deepEqual(
      inspectAdminSecrets({ ADMIN_PASSWORD: "", ADMIN_SECRET: usable.ADMIN_SECRET }),
      { ok: false, reason: "missing" },
    );
  });

  it("rejects documented example values in every environment", () => {
    for (const example of EXAMPLE_ADMIN_SECRETS) {
      assert.deepEqual(
        inspectAdminSecrets({
          ...usable,
          ADMIN_PASSWORD: example,
          NODE_ENV: "development",
        }),
        { ok: false, reason: "example" },
      );
      assert.deepEqual(
        inspectAdminSecrets({
          ...usable,
          ADMIN_SECRET: example,
          NODE_ENV: "production",
        }),
        { ok: false, reason: "example" },
      );
    }
  });

  it("allows short non-example secrets outside production", () => {
    const env = {
      ADMIN_PASSWORD: "local-dev",
      ADMIN_SECRET: "short-secret",
      NODE_ENV: "development",
    };
    assert.deepEqual(inspectAdminSecrets(env), {
      ok: true,
      password: "local-dev",
      secret: "short-secret",
    });
    assert.deepEqual(resolveAdminSecrets(env), {
      password: "local-dev",
      secret: "short-secret",
    });
  });

  it("rejects short secrets only in production", () => {
    const shortPassword = "x".repeat(MIN_ADMIN_PASSWORD_LENGTH - 1);
    const shortSecret = "y".repeat(MIN_ADMIN_SECRET_LENGTH - 1);
    assert.deepEqual(
      inspectAdminSecrets({
        ADMIN_PASSWORD: shortPassword,
        ADMIN_SECRET: usable.ADMIN_SECRET,
        NODE_ENV: "production",
      }),
      { ok: false, reason: "short" },
    );
    assert.deepEqual(
      inspectAdminSecrets({
        ADMIN_PASSWORD: usable.ADMIN_PASSWORD,
        ADMIN_SECRET: shortSecret,
        NODE_ENV: "production",
      }),
      { ok: false, reason: "short" },
    );
    assert.equal(
      resolveAdminSecrets({
        ADMIN_PASSWORD: shortPassword,
        ADMIN_SECRET: usable.ADMIN_SECRET,
        NODE_ENV: "production",
      }),
      null,
    );
  });

  it("accepts long non-example secrets in production", () => {
    assert.ok(usable.ADMIN_PASSWORD.length >= MIN_ADMIN_PASSWORD_LENGTH);
    assert.ok(usable.ADMIN_SECRET.length >= MIN_ADMIN_SECRET_LENGTH);
    assert.deepEqual(inspectAdminSecrets({ ...usable, NODE_ENV: "production" }), {
      ok: true,
      password: usable.ADMIN_PASSWORD,
      secret: usable.ADMIN_SECRET,
    });
  });
});

describe("adminUnconfiguredMessage", () => {
  it("tells the operator why login is disabled", () => {
    assert.match(adminUnconfiguredMessage("missing"), /ADMIN_PASSWORD and ADMIN_SECRET/);
    assert.match(adminUnconfiguredMessage("example"), /example/);
    assert.match(adminUnconfiguredMessage("short"), /12/);
    assert.match(adminUnconfiguredMessage("short"), /24/);
  });
});
