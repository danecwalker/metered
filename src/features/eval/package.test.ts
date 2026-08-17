import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentHash, integrityOf } from "@/features/eval/hash";
import { sealPackage } from "@/features/eval/package";
import type { OfficialSuite } from "@/features/eval/types";
import { verifyPackage } from "@/features/eval/verify";

const prompt = "Return JSON with a key named ok.";
const official: OfficialSuite = {
  suiteVersion: "work-test",
  suiteHash: "will-set",
  workChars: 40,
  workMu: 10,
  tasks: [
    {
      id: "extract",
      label: "Extract",
      prompt,
      promptHash: contentHash(prompt),
      check: "extract-json",
      expectedKeys: ["ok"],
      workChars: 40,
    },
  ],
};

official.suiteHash = "locked";

function makePkg(output = '{"ok":true}', usage = { input: 10, output: 4, reasoning: 0, cacheHit: 0 }) {
  return sealPackage(
    {
      suiteVersion: official.suiteVersion,
      suiteHash: official.suiteHash,
      stack: {
        modelName: "Test",
        modelSlug: "test",
        lab: "Lab",
        harnessId: "hrs_api",
        harnessSlug: "api",
        provider: "OpenRouter",
        sku: "test/model",
        setting: "default",
        listInput: 1,
        listOutput: 2,
      },
      run: {
        startedAt: "2026-08-17T00:00:00.000Z",
        finishedAt: "2026-08-17T00:00:01.000Z",
        tasks: [
          {
            id: "extract",
            promptHash: official.tasks[0].promptHash,
            output,
            outputHash: "",
            usage,
            providerUsage: { prompt_tokens: usage.input, completion_tokens: usage.output },
            passed: true,
            check: "extract-json",
            attempts: 1,
          },
        ],
      },
    },
    { extract: ["ok"] },
  );
}

describe("eval package verify", () => {
  it("accepts a sealed package on the official suite", () => {
    const pkg = makePkg();
    const result = verifyPackage(pkg, official);
    assert.equal(result.ok, true, result.issues.map((issue) => issue.message).join("; "));
  });

  it("rejects edited totals", () => {
    const pkg = makePkg();
    pkg.totals.input = 999;
    const result = verifyPackage(pkg, official);
    assert.equal(result.checks.integrity, false);
    assert.equal(result.ok, false);
  });

  it("rejects a swapped prompt hash", () => {
    const pkg = makePkg();
    pkg.run.tasks[0].promptHash = "0".repeat(64);
    const { integrity, ...body } = pkg;
    void integrity;
    pkg.integrity = integrityOf(body);
    const result = verifyPackage(pkg, official);
    assert.equal(result.checks.promptLock, false);
  });
});
