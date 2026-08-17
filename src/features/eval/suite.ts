import { readFile } from "node:fs/promises";
import path from "node:path";
import { SCENARIOS } from "@/features/basket/slices";
import { contentHash, integrityOf } from "@/features/eval/hash";
import type { EvalCheck, OfficialSuite, OfficialTask } from "@/features/eval/types";
import {
  characterCount,
  meteredUnits,
  WORK_SUITE_VERSION,
} from "@/features/pricing/math";

/** Official work-2026.08-complete task count. */
export const OFFICIAL_TASK_COUNT = SCENARIOS.length;

const TASK_SPEC: Record<
  string,
  { check: EvalCheck; mustInclude?: string[] }
> = {
  chat: { check: "contains", mustInclude: ["true price", "mu"] },
  rag: { check: "contains", mustInclude: ["renormal", "cjk"] },
  extract: { check: "extract-json" },
  agent: { check: "contains", mustInclude: ["gpt-5.4", "2.50"] },
  review: { check: "contains", mustInclude: ["fertility", "13.25"] },
};

export async function loadOfficialSuite(
  root: string = process.cwd(),
): Promise<OfficialSuite> {
  const tasks: OfficialTask[] = [];
  for (const scenario of SCENARIOS) {
    const input = await readFile(
      path.join(root, "data", "scenarios", scenario.inputFile),
      "utf8",
    );
    const output = await readFile(
      path.join(root, "data", "scenarios", scenario.outputFile),
      "utf8",
    );
    const spec = TASK_SPEC[scenario.id] ?? { check: "contains" as const };
    const expectedJson =
      spec.check === "extract-json" ? expectedJsonFrom(output) : undefined;
    const expectedKeys = expectedJson ? Object.keys(expectedJson).sort() : undefined;
    const workChars = characterCount(input) + characterCount(output);
    tasks.push({
      id: scenario.id,
      label: scenario.label,
      prompt: input,
      promptHash: contentHash(input),
      check: spec.check,
      expectedKeys,
      expectedJson,
      mustInclude: spec.mustInclude,
      workChars,
    });
  }

  const workChars = tasks.reduce((sum, task) => sum + task.workChars, 0);
  const suiteHash = integrityOf(
    tasks.map((task) => ({
      id: task.id,
      promptHash: task.promptHash,
      check: task.check,
      expectedKeys: task.expectedKeys ?? null,
      expectedJson: task.expectedJson ?? null,
      mustInclude: task.mustInclude ?? null,
    })),
  );

  return {
    suiteVersion: WORK_SUITE_VERSION,
    suiteHash,
    workChars,
    workMu: meteredUnits(workChars),
    tasks,
  };
}

function expectedJsonFrom(output: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(output.trim());
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
