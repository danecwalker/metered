import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apiReasoningEffort, parseEffort } from "./effort";

describe("effort", () => {
  it("parses aliases", () => {
    assert.equal(parseEffort("HIGH"), "high");
    assert.equal(parseEffort("med"), "medium");
    assert.equal(parseEffort("x-high"), "xhigh");
    assert.equal(parseEffort("nope"), null);
  });

  it("maps to the API reasoning field", () => {
    assert.equal(apiReasoningEffort("default"), undefined);
    assert.equal(apiReasoningEffort("none"), "none");
    assert.equal(apiReasoningEffort("high"), "high");
    assert.equal(apiReasoningEffort("max"), "xhigh");
  });
});
