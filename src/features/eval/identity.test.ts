import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { identityError, skuFitsHarness } from "./identity";

describe("skuFitsHarness", () => {
  it("keeps Claude SKUs off ChatGPT and the reverse", () => {
    assert.equal(skuFitsHarness("claude", "claude-opus-4-6"), true);
    assert.equal(skuFitsHarness("chatgpt", "gpt-5.4"), true);
    assert.equal(skuFitsHarness("chatgpt", "claude-opus-4-6"), false);
    assert.equal(skuFitsHarness("claude", "gpt-5.4"), false);
  });

  it("lets the API harness take any sku", () => {
    assert.equal(skuFitsHarness("api", "claude-opus-4-6"), true);
    assert.equal(skuFitsHarness("api", "gpt-5.4"), true);
  });

  it("keeps Gemini, Kimi, and DeepSeek SKUs on their own harnesses", () => {
    assert.equal(skuFitsHarness("gemini", "gemini-2.5-pro"), true);
    assert.equal(skuFitsHarness("gemini", "claude-opus-4-6"), false);
    assert.equal(skuFitsHarness("kimi", "kimi-k2.5"), true);
    assert.equal(skuFitsHarness("kimi", "moonshot-v1"), true);
    assert.equal(skuFitsHarness("kimi", "gpt-5.4"), false);
    assert.equal(skuFitsHarness("deepseek", "deepseek-v4-pro"), true);
    assert.equal(skuFitsHarness("deepseek", "claude-opus-4-6"), false);
    assert.equal(skuFitsHarness("chatgpt", "gemini-2.5-pro"), false);
  });
});

describe("identityError", () => {
  it("names a Claude model filed as ChatGPT", () => {
    const error = identityError("chatgpt", "claude-sonnet-4-6");
    assert.ok(error);
    assert.match(error, /cannot be filed/i);
  });
});
