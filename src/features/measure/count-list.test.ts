import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeCountTargets, parseCountList, parseModelRef } from "@/features/measure/count-list";

describe("parseModelRef", () => {
  it("accepts models.dev ids and guesses a lab from a bare SKU", () => {
    assert.deepEqual(parseModelRef("anthropic/claude-opus-5"), {
      lab: "anthropic",
      sku: "claude-opus-5",
      catalogId: "anthropic/claude-opus-5",
    });
    assert.deepEqual(parseModelRef("claude-fable-5")?.catalogId, "anthropic/claude-fable-5");
    assert.deepEqual(parseModelRef("grok-4.6")?.catalogId, "xai/grok-4.6");
    assert.deepEqual(parseModelRef("google/gemini-2.5-pro")?.lab, "gemini");
    assert.equal(parseModelRef("not-a-model"), null);
  });
});

describe("parseCountList", () => {
  it("reads a models: yaml list", () => {
    const rows = parseCountList(`
models:
  - anthropic/claude-opus-5
  - claude-fable-5
  - xai/grok-4.6
`);
    assert.deepEqual(
      rows.map((row) => row.catalogId),
      ["anthropic/claude-opus-5", "anthropic/claude-fable-5", "xai/grok-4.6"],
    );
  });

  it("reads lab-keyed yaml and a plain text list", () => {
    const yaml = parseCountList(`
anthropic:
  - claude-opus-4-8
xai:
  - grok-4.6
`);
    assert.equal(yaml.length, 2);
    const txt = parseCountList(`
# comment
anthropic/claude-sonnet-5
gemini-2.5-pro
`);
    assert.deepEqual(
      txt.map((row) => row.catalogId),
      ["anthropic/claude-sonnet-5", "google/gemini-2.5-pro"],
    );
  });

  it("dedupes merged lists", () => {
    const merged = mergeCountTargets(parseCountList("- claude-opus-5"), [
      parseModelRef("anthropic/claude-opus-5")!,
      parseModelRef("anthropic/claude-fable-5")!,
    ]);
    assert.deepEqual(
      merged.map((row) => row.sku),
      ["claude-opus-5", "claude-fable-5"],
    );
  });
});
