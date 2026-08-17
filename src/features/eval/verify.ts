import { EVAL_FORMAT, contentHash, integrityOf } from "@/features/eval/hash";
import { totalsFromTasks } from "@/features/eval/package";
import { scoreOutput } from "@/features/eval/score";
import type {
  EvalPackage,
  OfficialSuite,
  VerifyIssue,
  VerifyResult,
} from "@/features/eval/types";

export function verifyPackage(pkg: EvalPackage, official: OfficialSuite): VerifyResult {
  const issues: VerifyIssue[] = [];
  const checks = {
    format: pkg.format === EVAL_FORMAT,
    integrity: false,
    suiteLock: false,
    promptLock: false,
    complete: false,
    outputHashes: false,
    totals: false,
    rescore: false,
  };

  if (!checks.format) {
    issues.push({ code: "format", message: `Expected ${EVAL_FORMAT}.` });
  }

  const { integrity, ...body } = pkg;
  checks.integrity = integrity === integrityOf(body);
  if (!checks.integrity) {
    issues.push({
      code: "integrity",
      message: "Package integrity hash does not match the contents. The file was edited after sealing.",
    });
  }

  checks.suiteLock =
    pkg.suiteVersion === official.suiteVersion && pkg.suiteHash === official.suiteHash;
  if (!checks.suiteLock) {
    issues.push({
      code: "suite",
      message: "Suite version or hash does not match the official lock. This is not our frozen jobs.",
    });
  }

  const officialById = new Map(official.tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  let promptsOk = true;
  let hashesOk = true;
  let rescoreOk = true;

  for (const task of pkg.run.tasks) {
    if (seen.has(task.id)) {
      issues.push({ code: "duplicate", message: `Task ${task.id} appears twice.` });
      promptsOk = false;
      continue;
    }
    seen.add(task.id);
    const officialTask = officialById.get(task.id);
    if (!officialTask) {
      issues.push({ code: "unknown_task", message: `Unknown task ${task.id}.` });
      promptsOk = false;
      continue;
    }
    if (task.promptHash !== officialTask.promptHash) {
      issues.push({
        code: "prompt",
        message: `Prompt hash for ${task.id} does not match the official suite.`,
      });
      promptsOk = false;
    }
    if (task.outputHash !== contentHash(task.output)) {
      issues.push({
        code: "output_hash",
        message: `Output hash for ${task.id} does not match the stored output.`,
      });
      hashesOk = false;
    }
    const expected = scoreOutput(officialTask.check, task.output, {
      expectedKeys: officialTask.expectedKeys,
      expectedJson: officialTask.expectedJson,
      mustInclude: officialTask.mustInclude,
    });
    if (task.passed !== expected) {
      issues.push({
        code: "rescore",
        message: `Pass flag for ${task.id} does not match our re-score of the stored output.`,
      });
      rescoreOk = false;
    }
    if (!nonNegInt(task.usage.input) || !nonNegInt(task.usage.output)) {
      issues.push({ code: "usage", message: `Usage for ${task.id} is not a count.` });
    }
  }

  checks.promptLock = promptsOk;
  checks.outputHashes = hashesOk;
  checks.rescore = rescoreOk;
  checks.complete = official.tasks.every((task) => seen.has(task.id));
  if (!checks.complete) {
    issues.push({
      code: "incomplete",
      message: "Package is missing one or more official tasks.",
    });
  }

  const recomputed = totalsFromTasks(pkg.run.tasks);
  checks.totals =
    pkg.totals.tasks === recomputed.tasks &&
    pkg.totals.input === recomputed.input &&
    pkg.totals.output === recomputed.output &&
    pkg.totals.reasoning === recomputed.reasoning &&
    pkg.totals.cacheHit === recomputed.cacheHit &&
    pkg.totals.passed === recomputed.passed;
  if (!checks.totals) {
    issues.push({
      code: "totals",
      message: "Headline totals do not equal the sum of the per-task usage.",
    });
  }

  return { ok: issues.length === 0, issues, checks };
}

function nonNegInt(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
