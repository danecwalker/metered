import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OFFICIAL_TASK_COUNT } from "@/features/eval/suite";
import {
  WORK_SUITE_VERSION,
  dollarsPerMu,
  workCostUsd,
} from "@/features/pricing/math";
import { rankIndexRows, summarizeWork } from "./rank";

const WORK_MU = 500_000;
const HARNESS = { id: "hrs_api", name: "API" };

describe("official suite size", () => {
  it("is 3 jobs on work-2026.08-py4", () => {
    assert.equal(WORK_SUITE_VERSION, "work-2026.08-py4");
    assert.equal(OFFICIAL_TASK_COUNT, 3);
  });
});

function summary(args: {
  passed: number | null;
  tasks?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cacheHitTokens?: number;
  listInput?: number;
  listOutput?: number | null;
  listCacheHit?: number | null;
}) {
  return summarizeWork(
    {
      suiteVersion: WORK_SUITE_VERSION,
      setting: "default",
      tasks: args.tasks ?? OFFICIAL_TASK_COUNT,
      passed: args.passed,
      inputTokens: args.inputTokens ?? 1_000_000,
      outputTokens: args.outputTokens ?? 100_000,
      reasoningTokens: args.reasoningTokens ?? 0,
      cacheHitTokens: args.cacheHitTokens ?? 0,
      source: "official",
    },
    HARNESS,
    {
      listInput: args.listInput ?? 1,
      listOutput: args.listOutput === undefined ? 2 : args.listOutput,
      listCacheHit: args.listCacheHit ?? null,
    },
    null,
    OFFICIAL_TASK_COUNT,
    WORK_MU,
  );
}

describe("summarizeWork $ / MU", () => {
  it("is defined for a complete official finish with a bill", () => {
    const work = summary({ passed: OFFICIAL_TASK_COUNT, tasks: OFFICIAL_TASK_COUNT });
    const total = workCostUsd({
      inputTokens: 1_000_000,
      outputTokens: 100_000,
      reasoningTokens: 0,
      cacheHitTokens: 0,
      listInput: 1,
      listOutput: 2,
      listCacheHit: null,
    });
    assert.equal(work.complete, true);
    assert.ok(total != null);
    assert.equal(work.dollarsPerMu, dollarsPerMu(total, WORK_MU));
    assert.ok(work.dollarsPerMu != null);
    assert.ok(work.costPerPass != null);
  });

  it("is null when passed < tasks", () => {
    const work = summary({ passed: 0, tasks: OFFICIAL_TASK_COUNT });
    assert.equal(work.complete, false);
    assert.equal(work.dollarsPerMu, null);
  });

  it("is null when the run is not the official suite size", () => {
    const work = summary({ passed: 2, tasks: 2 });
    assert.equal(work.complete, false);
    assert.equal(work.dollarsPerMu, null);
  });

  it("is null when a complete run has no token counts", () => {
    const work = summary({
      passed: OFFICIAL_TASK_COUNT,
      tasks: OFFICIAL_TASK_COUNT,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheHitTokens: 0,
    });
    assert.equal(work.complete, true);
    assert.equal(work.dollarsPerMu, null);
    assert.equal(work.costPerPass, null);
    assert.equal(work.tokensPerPass, null);
  });

  it("has no useful cost when passed is 0", () => {
    const work = summary({ passed: 0, tasks: OFFICIAL_TASK_COUNT });
    assert.equal(work.complete, false);
    assert.equal(work.dollarsPerMu, null);
    assert.equal(work.costPerPass, null);
    assert.equal(work.tokensPerPass, null);
  });
});

describe("rankIndexRows", () => {
  it("sorts complete cheap $ / MU first, incomplete passes next, no work last", () => {
    const cheap = summary({
      passed: OFFICIAL_TASK_COUNT,
      listInput: 1,
      listOutput: 1,
    });
    const expensive = summary({
      passed: OFFICIAL_TASK_COUNT,
      listInput: 10,
      listOutput: 10,
    });
    const partial = summary({ passed: 0, tasks: OFFICIAL_TASK_COUNT });
    const none = null;
    assert.ok(cheap.dollarsPerMu != null);
    assert.ok(expensive.dollarsPerMu != null);
    assert.ok(cheap.dollarsPerMu < expensive.dollarsPerMu);
    assert.equal(partial.dollarsPerMu, null);

    const ranked = rankIndexRows([
      { stack: "no-work", work: none },
      { stack: "partial", work: partial },
      { stack: "expensive-complete", work: expensive },
      { stack: "cheap-complete", work: cheap },
    ]);
    assert.deepEqual(
      ranked.map((row) => row.stack),
      ["cheap-complete", "expensive-complete", "partial", "no-work"],
    );
  });

  it("does not rank a failed cheap job ahead of an expensive finish", () => {
    const cheapPartial = summary({
      passed: 0,
      tasks: OFFICIAL_TASK_COUNT,
      listInput: 0.01,
      listOutput: 0.01,
    });
    const expensiveComplete = summary({
      passed: OFFICIAL_TASK_COUNT,
      tasks: OFFICIAL_TASK_COUNT,
      listInput: 100,
      listOutput: 200,
    });
    assert.equal(cheapPartial.dollarsPerMu, null);
    assert.ok(expensiveComplete.dollarsPerMu != null);

    const ranked = rankIndexRows([
      { stack: "cheap-fail", work: cheapPartial },
      { stack: "expensive-finish", work: expensiveComplete },
    ]);
    assert.equal(ranked[0]?.stack, "expensive-finish");
    assert.equal(ranked[1]?.stack, "cheap-fail");
  });
});
