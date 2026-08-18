export type AliasKind = "provider" | "sku";

export type CatalogAlias = {
  kind: AliasKind;
  source: string;
  target: string;
};

/**
 * Built-in remaps from harness / product names onto models.dev ids.
 * Admin rows overlay these. Example: Qwen Code reports "qwen", the lab is Alibaba.
 */
export const DEFAULT_PROVIDER_ALIASES: Record<string, string> = {
  qwen: "alibaba",
  dashscope: "alibaba",
  alibaba: "alibaba",
  chatgpt: "openai",
  codex: "openai",
  openai: "openai",
  claude: "anthropic",
  anthropic: "anthropic",
  grok: "xai",
  xai: "xai",
  gemini: "google",
  google: "google",
  kimi: "moonshotai",
  moonshot: "moonshotai",
  "moonshot-ai": "moonshotai",
  moonshotai: "moonshotai",
  deepcode: "deepseek",
  deepseek: "deepseek",
};

export const DEFAULT_ALIASES: CatalogAlias[] = Object.entries(DEFAULT_PROVIDER_ALIASES).map(
  ([source, target]) => ({ kind: "provider" as const, source, target }),
);

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
}

export function mergeAliases(rows: CatalogAlias[]): {
  provider: Map<string, string>;
  sku: Map<string, string>;
} {
  const provider = new Map(Object.entries(DEFAULT_PROVIDER_ALIASES));
  const sku = new Map<string, string>();
  for (const row of rows) {
    const source = normalizeToken(row.source);
    const target = row.target.trim().toLowerCase();
    if (!source || !target) continue;
    if (row.kind === "provider") provider.set(source, normalizeToken(target));
    else sku.set(source, target);
  }
  return { provider, sku };
}

export function applyAlias(map: Map<string, string>, value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const token = normalizeToken(raw);
  return map.get(token) ?? token;
}

export function guessLabId(lab: string | null | undefined, labId?: string | null): string | null {
  if (labId?.trim()) return normalizeToken(labId);
  if (!lab?.trim()) return null;
  const token = normalizeToken(lab);
  return DEFAULT_PROVIDER_ALIASES[token] ?? token;
}
