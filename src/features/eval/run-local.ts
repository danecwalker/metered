import { slugify } from "@/features/admin/schemas";
import type { Effort } from "@/features/eval/effort";
import { contentHash } from "@/features/eval/hash";
import { sealPackage } from "@/features/eval/package";
import { scoreOutput } from "@/features/eval/score";
import { loadOfficialSuite } from "@/features/eval/suite";
import type { EvalPackage, EvalTaskResult, OfficialTask } from "@/features/eval/types";
import { HARNESSES } from "@/features/harness/catalog";
import { DEFAULT_MAX_ATTEMPTS } from "@/features/pricing/math";

export type HarnessTurn = {
  output: string;
  usage: EvalTaskResult["usage"];
  providerUsage: unknown;
};

export type HarnessDriver = {
  slug: string;
  run(task: OfficialTask): Promise<HarnessTurn>;
};

export type LocalRunInput = {
  root?: string;
  modelName: string;
  lab: string;
  harnessSlug: string;
  provider: string;
  sku: string;
  setting: Effort;
  listInput: number;
  listOutput: number | null;
  maxAttempts?: number;
  driver: HarnessDriver;
};

export function retryTask(task: OfficialTask, attempt: number, previousOutput: string): OfficialTask {
  if (attempt <= 1) return task;
  return {
    ...task,
    prompt: `${task.prompt}\n\n---\nAttempt ${attempt}. The previous answer failed the official check.\nPrevious answer:\n${previousOutput}\n\nSubmit a corrected answer to the original task.`,
  };
}

export function addUsage(
  left: EvalTaskResult["usage"],
  right: EvalTaskResult["usage"],
): EvalTaskResult["usage"] {
  return {
    input: left.input + right.input,
    output: left.output + right.output,
    reasoning: left.reasoning + right.reasoning,
    cacheHit: left.cacheHit + right.cacheHit,
  };
}

export async function runLocalEval(input: LocalRunInput): Promise<EvalPackage> {
  const harness = HARNESSES.find((item) => item.slug === input.harnessSlug);
  if (!harness) {
    throw new Error(`Unknown harness "${input.harnessSlug}".`);
  }
  if (input.driver.slug !== harness.slug) {
    throw new Error(
      `Driver is ${input.driver.slug} but the stack says ${harness.slug}.`,
    );
  }

  const suite = await loadOfficialSuite(input.root);
  const startedAt = new Date().toISOString();
  const tasks: EvalTaskResult[] = [];
  const maxAttempts = Math.min(8, Math.max(1, input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS));

  for (const task of suite.tasks) {
    let usage: EvalTaskResult["usage"] = { input: 0, output: 0, reasoning: 0, cacheHit: 0 };
    let output = "";
    let providerUsage: unknown = null;
    let passed = false;
    let attempts = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attempts = attempt;
      process.stderr.write(`task ${task.id} attempt ${attempt}/${maxAttempts}…\n`);
      const turn = await input.driver.run(retryTask(task, attempt, output));
      usage = addUsage(usage, turn.usage);
      output = turn.output;
      providerUsage = turn.providerUsage;
      passed = scoreOutput(task.check, output, {
        expectedKeys: task.expectedKeys,
        expectedJson: task.expectedJson,
        mustInclude: task.mustInclude,
      });
      if (passed) break;
    }

    tasks.push({
      id: task.id,
      promptHash: task.promptHash,
      output,
      outputHash: contentHash(output),
      usage,
      providerUsage,
      passed,
      check: task.check,
      attempts,
    });
  }

  const specs = Object.fromEntries(
    suite.tasks.map((task) => [
      task.id,
      {
        expectedKeys: task.expectedKeys,
        expectedJson: task.expectedJson,
        mustInclude: task.mustInclude,
      },
    ]),
  );

  return sealPackage(
    {
      suiteVersion: suite.suiteVersion,
      suiteHash: suite.suiteHash,
      stack: {
        modelName: input.modelName.trim(),
        modelSlug: slugify(input.modelName),
        lab: input.lab.trim(),
        harnessId: harness.id,
        harnessSlug: harness.slug,
        provider: input.provider.trim(),
        sku: input.sku.trim(),
        setting: input.setting,
        listInput: input.listInput,
        listOutput: input.listOutput,
      },
      run: {
        startedAt,
        finishedAt: new Date().toISOString(),
        tasks,
      },
    },
    specs,
  );
}
