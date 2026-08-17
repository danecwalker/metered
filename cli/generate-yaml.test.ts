import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KNOWN_HARNESSES, renderEvalYaml } from "./generate-yaml";

describe("renderEvalYaml", () => {
  it("always includes the api harness and detected CLIs", () => {
    const yaml = renderEvalYaml({
      present: KNOWN_HARNESSES.filter((item) => item.slug === "claude"),
      missing: KNOWN_HARNESSES.filter((item) => item.slug !== "claude"),
    });
    assert.match(yaml, /max_attempts: 3/);
    assert.match(yaml, /default_effort: default/);
    assert.match(yaml, /harnesses:\n  api:/);
    assert.match(yaml, /  claude:\n    type: command/);
    assert.match(yaml, /Looked for, not on PATH/);
    assert.doesNotMatch(yaml, /\n  grok:/);
  });

  it("can comment in missing harnesses", () => {
    const yaml = renderEvalYaml({
      present: [],
      missing: KNOWN_HARNESSES.filter((item) => item.slug === "grok"),
      includeMissing: true,
    });
    assert.match(yaml, /# grok:/);
  });
});
