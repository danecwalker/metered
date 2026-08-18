import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHARS_PER_MU,
  characterCount,
  costForTokens,
  fertility,
  meteredUnits,
  tokensPerPass,
  truePrice,
  weightedMean,
  workCostUsd,
  workPricePerPass,
  dollarsPerMu,
  runIsComplete,
} from "./math";

describe("characterCount", () => {
  it("counts Unicode scalar values after NFC", () => {
    assert.equal(characterCount("hello"), 5);
    assert.equal(characterCount("é"), 1);
    assert.equal(characterCount("e\u0301"), 1);
    assert.equal(characterCount("桃花源"), 3);
    assert.equal(characterCount("a\r\nb"), 3);
  });
});

describe("fertility and true price", () => {
  it("is 1.00 when the tokenizer matches 4 chars per token", () => {
    const chars = 400_000;
    const tokens = chars / CHARS_PER_MU;
    assert.equal(meteredUnits(chars), 100_000);
    assert.equal(fertility(tokens, chars), 1);
    assert.equal(truePrice(2.5, 1), 2.5);
  });

  it("raises true price when the tokenizer is fatter", () => {
    const chars = 400_000;
    const units = meteredUnits(chars);
    const tokens = units * 2.65;
    const fert = fertility(tokens, chars);
    assert.ok(fert);
    assert.equal(Number(fert.toFixed(2)), 2.65);
    assert.equal(Number(truePrice(5, fert).toFixed(2)), 13.25);
  });

  it("returns null fertility for empty text", () => {
    assert.equal(fertility(10, 0), null);
  });
});

describe("costForTokens", () => {
  it("bills native tokens at list price", () => {
    assert.equal(costForTokens(1_000_000, 2.5), 2.5);
    assert.equal(costForTokens(100_000, 2.5), 0.25);
  });
});

describe("work price", () => {
  it("bills thinking at the output rate", () => {
    const usd = workCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      reasoningTokens: 900_000,
      cacheHitTokens: 0,
      listInput: 1,
      listOutput: 2,
      listCacheHit: null,
    });
    assert.equal(usd, 1 + 2);
  });

  it("is tokens per pass including thought and failed attempts", () => {
    assert.equal(tokensPerPass(100, 20, 80, 2), 100);
    assert.equal(tokensPerPass(100, 20, 80, 1), 200);
    assert.equal(tokensPerPass(100, 20, 80, 0), null);
    assert.equal(tokensPerPass(100, 20, 80, null), null);
  });

  it("prices only passed work, with every token still in the bill", () => {
    assert.equal(workPricePerPass(4, 2), 2);
    assert.equal(workPricePerPass(4, 1), 4);
    assert.equal(workPricePerPass(4, 0), null);
  });

  it("only treats a full suite finish as complete", () => {
    assert.equal(runIsComplete(5, 5, 5), true);
    assert.equal(runIsComplete(4, 5, 5), false);
    assert.equal(runIsComplete(5, 5, 4), false);
    assert.equal(runIsComplete(0, 5, 5), false);
  });

  it("expresses the suite bill as $ / MU on official work MU", () => {
    assert.equal(dollarsPerMu(2, 500_000), 0.000004);
    assert.equal(dollarsPerMu(0.5, 10), 0.05);
    assert.equal(dollarsPerMu(1, 0), null);
  });
});

describe("weightedMean", () => {
  it("renormalizes positive weights", () => {
    const mean = weightedMean([
      { value: 2, weight: 0.3 },
      { value: 4, weight: 0.1 },
    ]);
    assert.equal(mean, 2.5);
  });

  it("returns null when nothing is measured", () => {
    assert.equal(weightedMean([]), null);
  });
});
