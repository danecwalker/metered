import {
  dollarsPerMu,
  runIsComplete,
  tokensPerPass,
  workCostUsd,
  workPricePerPass,
} from "@/features/pricing/math";
import type { MeasurementSource } from "@/features/pricing/types";

export type WorkSummary = {
  suiteVersion: string;
  harnessId: string;
  harnessName: string;
  setting: string;
  tasks: number;
  passed: number | null;
  complete: boolean;
  tokensPerPass: number | null;
  tokenEfficiency: number | null;
  costPerPass: number | null;
  dollarsPerMu: number | null;
  source: MeasurementSource;
};

export type WorkRunLike = {
  suiteVersion: string;
  setting: string;
  tasks: number;
  passed: number | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheHitTokens: number;
  source: MeasurementSource;
};

export type WorkPrices = {
  listInput: number;
  listOutput: number | null;
  listCacheHit: number | null;
};

export type RankableRow = {
  stack: string;
  work: WorkSummary | null;
};

export function summarizeWork(
  run: WorkRunLike,
  harness: { id: string; name: string },
  prices: WorkPrices,
  cheapestTokens: number | null,
  officialTasks: number,
  workMu: number,
): WorkSummary {
  const complete = runIsComplete(run.passed, run.tasks, officialTasks);
  const tpp = tokensPerPass(
    run.inputTokens,
    run.outputTokens,
    run.reasoningTokens,
    run.passed,
  );
  const total = workCostUsd({
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    reasoningTokens: run.reasoningTokens,
    cacheHitTokens: run.cacheHitTokens,
    listInput: prices.listInput,
    listOutput: prices.listOutput,
    listCacheHit: prices.listCacheHit,
  });
  const hasUsage =
    run.inputTokens + run.outputTokens + run.reasoningTokens + run.cacheHitTokens > 0;
  const perPass = total == null || !hasUsage ? null : workPricePerPass(total, run.passed);
  return {
    suiteVersion: run.suiteVersion,
    harnessId: harness.id,
    harnessName: harness.name,
    setting: run.setting,
    tasks: run.tasks,
    passed: run.passed,
    complete,
    tokensPerPass: hasUsage ? tpp : null,
    tokenEfficiency:
      complete && hasUsage && tpp != null && cheapestTokens != null && cheapestTokens > 0
        ? tpp / cheapestTokens
        : null,
    costPerPass: perPass,
    dollarsPerMu:
      complete && hasUsage && total != null ? dollarsPerMu(total, workMu) : null,
    source: run.source,
  };
}

export function rankBucket(row: RankableRow): number {
  if (row.work?.dollarsPerMu != null) return 0;
  if (row.work && row.work.passed != null && row.work.passed > 0) return 1;
  if (row.work) return 2;
  return 3;
}

export function compareIndexRows(a: RankableRow, b: RankableRow): number {
  const aRank = rankBucket(a);
  const bRank = rankBucket(b);
  if (aRank !== bRank) return aRank - bRank;
  if (aRank === 0) {
    return (a.work?.dollarsPerMu ?? 0) - (b.work?.dollarsPerMu ?? 0);
  }
  if (aRank === 1) {
    const aRate = (a.work?.passed ?? 0) / Math.max(1, a.work?.tasks ?? 1);
    const bRate = (b.work?.passed ?? 0) / Math.max(1, b.work?.tasks ?? 1);
    if (aRate !== bRate) return bRate - aRate;
  }
  return a.stack.localeCompare(b.stack);
}

export function rankIndexRows<T extends RankableRow>(rows: T[]): T[] {
  return rows.sort(compareIndexRows);
}
