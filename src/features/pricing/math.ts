export const CHARS_PER_MU = 4;
export const BASKET_VERSION = "basket-2026.08-preview";
export const WORK_SUITE_VERSION = "work-2026.08-py4";
export const DEFAULT_MAX_ATTEMPTS = 3;

export function normalizeText(text: string): string {
  return text.normalize("NFC").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Unicode scalar count after NFC + LF normalization. */
export function characterCount(text: string): number {
  return [...normalizeText(text)].length;
}

export function meteredUnits(chars: number): number {
  return chars / CHARS_PER_MU;
}

/** Native tokens per Metered Unit. 1.00 means ~4 characters per native token. */
export function fertility(nativeTokens: number, chars: number): number | null {
  const units = meteredUnits(chars);
  if (units <= 0 || nativeTokens < 0) return null;
  return nativeTokens / units;
}

/** $/M MU = list $/M native tokens × fertility. */
export function truePrice(
  listPerMillionNative: number,
  fert: number,
): number {
  return listPerMillionNative * fert;
}

export function costForTokens(
  nativeTokens: number,
  listPerMillionNative: number,
): number {
  return (nativeTokens / 1_000_000) * listPerMillionNative;
}

/**
 * OpenAI-style reports fold cache reads into input. Anthropic/xAI report
 * uncached input and cache reads as separate counters (cache often larger).
 */
export function uncachedInputTokens(inputTokens: number, cacheHitTokens: number): number {
  if (cacheHitTokens > 0 && cacheHitTokens <= inputTokens) {
    return inputTokens - cacheHitTokens;
  }
  return Math.max(0, inputTokens);
}

/**
 * Reasoning is usually a subset of output (Grok, OpenAI). When it is larger
 * than output, the harness reported thinking as its own bucket.
 */
export function billedOutputTokens(outputTokens: number, reasoningTokens: number): number {
  if (reasoningTokens > 0 && reasoningTokens <= outputTokens) {
    return outputTokens;
  }
  return outputTokens + reasoningTokens;
}

/**
 * All billed tokens — retries, thinking, failed attempts — per task that
 * passed. Unpassed work is not a useful rate. Cache reads are a price
 * discount, not extra work, so they drop out of this rate.
 */
export function tokensPerPass(
  inputTokens: number,
  outputTokens: number,
  reasoningTokens: number,
  passed: number | null | undefined,
  cacheHitTokens = 0,
): number | null {
  if (passed == null || passed <= 0) return null;
  return (
    (uncachedInputTokens(inputTokens, cacheHitTokens) +
      billedOutputTokens(outputTokens, reasoningTokens)) /
    passed
  );
}

export function workCostUsd(args: {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheHitTokens: number;
  cacheWriteTokens?: number;
  listInput: number;
  listOutput: number | null;
  listCacheHit: number | null;
  listCacheWrite?: number | null;
}): number | null {
  const outputRate = args.listOutput;
  if (outputRate == null) return null;
  const cached = args.cacheHitTokens;
  const written = args.cacheWriteTokens ?? 0;
  const hitRate = args.listCacheHit ?? args.listInput;
  const writeRate = args.listCacheWrite ?? args.listInput;
  return (
    costForTokens(uncachedInputTokens(args.inputTokens, cached), args.listInput) +
    costForTokens(written, writeRate) +
    costForTokens(cached, hitRate) +
    costForTokens(billedOutputTokens(args.outputTokens, args.reasoningTokens), outputRate)
  );
}

export function workPricePerPass(
  totalUsd: number,
  passed: number | null | undefined,
): number | null {
  if (passed == null || passed <= 0) return null;
  return totalUsd / passed;
}

export function runIsComplete(
  passed: number | null | undefined,
  tasks: number,
  officialTasks?: number,
): boolean {
  if (passed == null || passed <= 0 || tasks <= 0) return false;
  if (passed !== tasks) return false;
  if (officialTasks != null && tasks !== officialTasks) return false;
  return true;
}

/**
 * Dollars per Metered Unit of official finished work.
 * 1 MU is 4 Unicode characters (NFC, LF) of the frozen jobs, not native tokens.
 */
export function dollarsPerMu(
  totalUsd: number,
  workMu: number,
): number | null {
  if (workMu <= 0 || totalUsd < 0 || !Number.isFinite(totalUsd)) return null;
  return totalUsd / workMu;
}

export function weightedMean(
  entries: { value: number; weight: number }[],
): number | null {
  let weightSum = 0;
  let acc = 0;
  for (const entry of entries) {
    if (entry.weight <= 0) continue;
    acc += entry.value * entry.weight;
    weightSum += entry.weight;
  }
  if (weightSum <= 0) return null;
  return acc / weightSum;
}
