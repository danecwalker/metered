import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EvalCheck, OfficialSuite, OfficialTask } from "@/features/eval/types";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";
import lock from "./official-lock.json";

export const OFFICIAL_TASK_COUNT = lock.tasks.length;

type LockTask = {
  id: string;
  label: string;
  prompt: string;
  promptHash: string;
  check: EvalCheck;
  expectedKeys: string[] | null;
  expectedJson: Record<string, unknown> | null;
  mustInclude: string[] | null;
  workChars: number;
};

export async function loadOfficialSuite(
  _root: string = process.cwd(),
): Promise<OfficialSuite> {
  if (lock.suiteVersion !== WORK_SUITE_VERSION) {
    throw new Error(
      `Official lock is ${lock.suiteVersion}, code expects ${WORK_SUITE_VERSION}.`,
    );
  }
  const tasks: OfficialTask[] = (lock.tasks as LockTask[]).map((task) => ({
    id: task.id,
    label: task.label,
    prompt: task.prompt,
    promptHash: task.promptHash,
    check: task.check,
    expectedKeys: task.expectedKeys ?? undefined,
    expectedJson: task.expectedJson ?? undefined,
    mustInclude: task.mustInclude ?? undefined,
    workChars: task.workChars,
  }));
  return {
    suiteVersion: lock.suiteVersion,
    suiteHash: lock.suiteHash,
    workChars: lock.workChars,
    workMu: lock.workMu,
    tasks,
  };
}

/** Used by tests that want the on-disk lock without going through cwd. */
export async function readOfficialLockFile(root = process.cwd()): Promise<string> {
  return readFile(path.join(root, "src/features/eval/official-lock.json"), "utf8");
}
