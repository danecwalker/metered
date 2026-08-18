import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runsAgree, stackConfidence, type RunSample } from "./confidence";

function sample(partial: Partial<RunSample> & { userId: string }): RunSample {
  return {
    reputation: 10,
    passed: 5,
    tasks: 5,
    inputTokens: 1000,
    outputTokens: 200,
    reasoningTokens: 0,
    ...partial,
  };
}

describe("runsAgree", () => {
  it("requires the same pass count", () => {
    assert.equal(
      runsAgree(sample({ userId: "a", passed: 5 }), sample({ userId: "b", passed: 1 })),
      false,
    );
  });

  it("allows a small token drift", () => {
    assert.equal(
      runsAgree(
        sample({ userId: "a", inputTokens: 1000 }),
        sample({ userId: "b", inputTokens: 1080 }),
      ),
      true,
    );
  });
});

describe("stackConfidence", () => {
  it("is low for a single user", () => {
    const got = stackConfidence([sample({ userId: "a" })]);
    assert.equal(got.level, "low");
    assert.equal(got.independent, 1);
  });

  it("rises when independent users agree", () => {
    const got = stackConfidence([
      sample({ userId: "a", reputation: 20 }),
      sample({ userId: "b", reputation: 20 }),
      sample({ userId: "c", reputation: 20 }),
    ]);
    assert.equal(got.independent, 3);
    assert.equal(got.level, "high");
  });

  it("counts one sample per user", () => {
    const got = stackConfidence([
      sample({ userId: "a", inputTokens: 1000 }),
      sample({ userId: "a", inputTokens: 9000 }),
    ]);
    assert.equal(got.independent, 1);
  });
});
