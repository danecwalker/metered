import type { Effort } from "@/features/eval/effort";
import { EVAL_FORMAT } from "@/features/eval/hash";

export type EvalCheck = "extract-json" | "contains" | "nonempty";

export type OfficialTask = {
  id: string;
  label: string;
  prompt: string;
  promptHash: string;
  check: EvalCheck;
  expectedKeys?: string[];
  expectedJson?: Record<string, unknown>;
  mustInclude?: string[];
  workChars: number;
};

export type OfficialSuite = {
  suiteVersion: string;
  suiteHash: string;
  workChars: number;
  workMu: number;
  tasks: OfficialTask[];
};

export type EvalTaskResult = {
  id: string;
  promptHash: string;
  output: string;
  outputHash: string;
  usage: {
    input: number;
    output: number;
    reasoning: number;
    cacheHit: number;
  };
  providerUsage: unknown;
  passed: boolean | null;
  check: EvalCheck;
  attempts: number;
};

export type EvalPackage = {
  format: typeof EVAL_FORMAT;
  evaluator: { name: "metered"; version: string };
  suiteVersion: string;
  suiteHash: string;
  stack: {
    modelName: string;
    modelSlug: string;
    lab: string;
    harnessId: string;
    harnessSlug: string;
    provider: string;
    sku: string;
    setting: Effort;
    listInput: number;
    listOutput: number | null;
  };
  run: {
    startedAt: string;
    finishedAt: string;
    tasks: EvalTaskResult[];
  };
  totals: {
    tasks: number;
    passed: number | null;
    input: number;
    output: number;
    reasoning: number;
    cacheHit: number;
  };
  integrity: string;
};

export type VerifyIssue = {
  code: string;
  message: string;
};

export type VerifyResult = {
  ok: boolean;
  issues: VerifyIssue[];
  checks: {
    format: boolean;
    integrity: boolean;
    suiteLock: boolean;
    promptLock: boolean;
    complete: boolean;
    outputHashes: boolean;
    totals: boolean;
    rescore: boolean;
  };
};
