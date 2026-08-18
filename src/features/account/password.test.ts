import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashPassword,
  normalizeUsername,
  passwordError,
  usernameError,
  verifyPassword,
} from "./password";

describe("password hash", () => {
  it("verifies the same password and rejects another", () => {
    const stored = hashPassword("correct-horse-battery");
    assert.equal(verifyPassword("correct-horse-battery", stored), true);
    assert.equal(verifyPassword("wrong-password-ok", stored), false);
  });
});

describe("usernameError", () => {
  it("accepts a simple handle", () => {
    assert.equal(usernameError("dane"), null);
    assert.equal(normalizeUsername("Dane"), "dane");
  });

  it("rejects short or decorated names", () => {
    assert.ok(usernameError("ab"));
    assert.ok(usernameError("Hello World"));
  });
});

describe("passwordError", () => {
  it("requires 10 characters", () => {
    assert.ok(passwordError("short"));
    assert.equal(passwordError("long-enough"), null);
  });
});
