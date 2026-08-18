import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listedAdminUsernames, userIsAdmin } from "./principals";

describe("userIsAdmin", () => {
  it("trusts a stored admin role", () => {
    assert.equal(userIsAdmin({ username: "sam", role: "admin" }), true);
    assert.equal(userIsAdmin({ username: "sam", role: "user" }), false);
  });
});

describe("listedAdminUsernames", () => {
  it("splits and lowercases the env list", () => {
    const prev = process.env.ADMIN_USERNAMES;
    process.env.ADMIN_USERNAMES = "Dane, other_user";
    try {
      assert.deepEqual(listedAdminUsernames(), ["dane", "other_user"]);
      assert.equal(userIsAdmin({ username: "dane", role: "user" }), true);
    } finally {
      if (prev == null) delete process.env.ADMIN_USERNAMES;
      else process.env.ADMIN_USERNAMES = prev;
    }
  });
});
