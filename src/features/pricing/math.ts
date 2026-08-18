export const CHARS_PER_MU = 4;
export const BASKET_VERSION = "basket-2026.08-preview";
export const WORK_SUITE_VERSION = "work-2026.08-py3";
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
 * All billed tokens — retries, thinking, failed attempts — per task that
 * passed. Unpassed work is not a useful rate.
 */
export function tokensPerPass(
  inputTokens: number,
  outputTokens: number,
  reasoningTokens: number,
  passed: number | null | undefined,
): number | null {
  if (passed == null || passed <= 0) return null;
  return (inputTokens + outputTokens + reasoningTokens) / passed;
}

export function workCostUsd(args: {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheHitTokens: number;
  listInput: number;
  listOutput: number | null;
  listCacheHit: number | null;
}): number | null {
  const outputRate = args.listOutput;
  if (outputRate == null) return null;
  const visibleAndThought = args.outputTokens + args.reasoningTokens;
  const cacheRate = args.listCacheHit;
  const cached = args.cacheHitTokens;
  const uncachedInput = Math.max(0, args.inputTokens - cached);
  return (
    costForTokens(uncachedInput, args.listInput) +
    (cacheRate == null ? costForTokens(cached, args.listInput) : costForTokens(cached, cacheRate)) +
    costForTokens(visibleAndThought, outputRate)
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
