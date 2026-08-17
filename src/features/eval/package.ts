import { EVAL_FORMAT, EVALUATOR_VERSION, contentHash, integrityOf } from "@/features/eval/hash";
import { scoreOutput } from "@/features/eval/score";
import type { EvalPackage, EvalTaskResult, OfficialSuite } from "@/features/eval/types";

export function totalsFromTasks(tasks: EvalTaskResult[]) {
  const passedCount = tasks.filter((task) => task.passed === true).length;
  const scored = tasks.some((task) => task.passed !== null);
  return {
    tasks: tasks.length,
    passed: scored ? passedCount : null,
    input: sum(tasks.map((task) => task.usage.input)),
    output: sum(tasks.map((task) => task.usage.output)),
    reasoning: sum(tasks.map((task) => task.usage.reasoning)),
    cacheHit: sum(tasks.map((task) => task.usage.cacheHit)),
  };
}

export type TaskScoreSpec = {
  expectedKeys?: string[];
  expectedJson?: Record<string, unknown>;
  mustInclude?: string[];
};

export function sealPackage(
  unsigned: Omit<EvalPackage, "integrity" | "totals" | "format" | "evaluator"> & {
    format?: EvalPackage["format"];
    evaluator?: EvalPackage["evaluator"];
    totals?: EvalPackage["totals"];
  },
  specs: Record<string, TaskScoreSpec | string[] | undefined> = {},
): EvalPackage {
  const tasks = unsigned.run.tasks.map((task) => {
    const spec = normalizeSpec(specs[task.id]);
    return {
      ...task,
      attempts: task.attempts > 0 ? task.attempts : 1,
      outputHash: contentHash(task.output),
      passed: scoreOutput(task.check, task.output, spec),
    };
  });
  const draft: Omit<EvalPackage, "integrity"> = {
    format: EVAL_FORMAT,
    evaluator: { name: "metered", version: EVALUATOR_VERSION },
    suiteVersion: unsigned.suiteVersion,
    suiteHash: unsigned.suiteHash,
    stack: unsigned.stack,
    run: { ...unsigned.run, tasks },
    totals: totalsFromTasks(tasks),
  };
  return { ...draft, integrity: integrityOf(draft) };
}

export function parseEvalPackage(raw: unknown): EvalPackage {
  if (!raw || typeof raw !== "object") {
    throw new Error("Package is not an object.");
  }
  const pkg = raw as EvalPackage;
  if (pkg.format !== EVAL_FORMAT) {
    throw new Error(`Unsupported package format: ${String(pkg.format)}`);
  }
  return pkg;
}

export function lockfileOf(suite: OfficialSuite) {
  return {
    format: EVAL_FORMAT,
    evaluatorVersion: EVALUATOR_VERSION,
    suiteVersion: suite.suiteVersion,
    suiteHash: suite.suiteHash,
    workMu: suite.workMu,
    tasks: suite.tasks.map((task) => ({
      id: task.id,
      label: task.label,
      promptHash: task.promptHash,
      check: task.check,
      expectedKeys: task.expectedKeys ?? null,
      mustInclude: task.mustInclude ?? null,
    })),
  };
}

function normalizeSpec(spec: TaskScoreSpec | string[] | undefined): TaskScoreSpec {
  if (Array.isArray(spec)) return { expectedKeys: spec };
  return spec ?? {};
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}
