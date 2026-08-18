import { HARNESSES } from "@/features/harness/catalog";

export const HARNESS_SLUGS = HARNESSES.map((item) => item.slug);

/** Binary the suite is allowed to exec for this harness. */
export const HARNESS_BINARIES: Record<string, string[]> = {
  claude: ["claude"],
  chatgpt: ["codex"],
  gemini: ["gemini"],
  grok: ["grok"],
  qwen: ["qwen", "qwen-code"],
  kimi: ["kimi"],
  deepseek: ["deepcode", "deepseek"],
  pi: ["pi"],
  opencode: ["opencode"],
  api: [],
  custom: [],
};

/** SKUs a harness may claim. api / opencode / custom can drive any published SKU. */
const SKU_PATTERN: Record<string, RegExp> = {
  claude: /^claude/i,
  chatgpt: /^(gpt-|o[1-9]|codex|chatgpt)/i,
  gemini: /^gemini/i,
  grok: /^grok/i,
  qwen: /^qwen/i,
  kimi: /^(kimi|moonshot)/i,
  deepseek: /^deepseek/i,
  api: /./,
  opencode: /./,
  pi: /./,
  custom: /./,
};

export function isKnownHarness(slug: string): boolean {
  return HARNESSES.some((item) => item.slug === slug);
}

export function skuFitsHarness(harnessSlug: string, sku: string): boolean {
  const pattern = SKU_PATTERN[harnessSlug];
  if (!pattern) return false;
  return pattern.test(sku.trim());
}

export function harnessIdForSlug(slug: string): string | null {
  return HARNESSES.find((item) => item.slug === slug)?.id ?? null;
}

export function identityError(harnessSlug: string, sku: string): string | null {
  if (!isKnownHarness(harnessSlug)) {
    return `Unknown harness "${harnessSlug}".`;
  }
  if (!sku.trim()) return "Package is missing a model SKU.";
  if (!skuFitsHarness(harnessSlug, sku)) {
    return `SKU ${sku} cannot be filed under the ${harnessSlug} harness.`;
  }
  return null;
}
