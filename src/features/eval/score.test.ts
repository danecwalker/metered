import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreOutput } from "./score";

describe("scoreOutput", () => {
  it("requires extract values when gold JSON is provided", () => {
    const gold = {
      model: "claude-opus-4-7",
      list_input: 5,
      list_output: null,
      fertility_tools: 2.65,
      true_input: 13.25,
    };
    assert.equal(
      scoreOutput("extract-json", JSON.stringify(gold), { expectedJson: gold }),
      true,
    );
    assert.equal(
      scoreOutput(
        "extract-json",
        JSON.stringify({ ...gold, true_input: 1 }),
        { expectedJson: gold },
      ),
      false,
    );
    assert.equal(
      scoreOutput("extract-json", '{"ok":true}', { expectedKeys: ["ok"] }),
      true,
    );
  });

  it("requires every needle for contains", () => {
    assert.equal(
      scoreOutput("contains", "True Price in MU, not tokens.", {
        mustInclude: ["true price", "mu"],
      }),
      true,
    );
    assert.equal(
      scoreOutput("contains", "Just tokens.", { mustInclude: ["true price", "mu"] }),
      false,
    );
  });
});
