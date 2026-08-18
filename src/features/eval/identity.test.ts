import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { identityError, skuFitsHarness } from "./identity";

describe("skuFitsHarness", () => {
  it("lets any known harness drive any SKU", () => {
    assert.equal(skuFitsHarness("claude", "claude-opus-4-6"), true);
    assert.equal(skuFitsHarness("chatgpt", "gpt-5.4"), true);
    assert.equal(skuFitsHarness("chatgpt", "claude-opus-4-6"), true);
    assert.equal(skuFitsHarness("qwen", "deepseek-v4-flash-0731"), true);
    assert.equal(skuFitsHarness("api", "claude-opus-4-6"), true);
    assert.equal(skuFitsHarness("kimi", "gpt-5.4"), true);
    assert.equal(skuFitsHarness("qwen", ""), false);
    assert.equal(skuFitsHarness("windsurf", "gpt-5.4"), false);
  });
});

describe("identityError", () => {
  it("rejects an unknown harness, not a cross-lab SKU", () => {
    assert.equal(identityError("chatgpt", "claude-sonnet-4-6"), null);
    assert.equal(identityError("qwen", "deepseek-v4-flash-0731"), null);
    const error = identityError("windsurf", "gpt-5.4");
    assert.ok(error);
    assert.match(error, /unknown harness/i);
  });
});
