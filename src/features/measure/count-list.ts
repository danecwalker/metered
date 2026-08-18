import { parse as parseYaml } from "yaml";

export const COUNT_LABS = ["anthropic", "xai", "gemini", "moonshot"] as const;
export type CountLab = (typeof COUNT_LABS)[number];

export type CountTarget = {
  lab: CountLab;
  sku: string;
  catalogId: string;
};

const LAB_OF: Record<string, CountLab> = {
  anthropic: "anthropic",
  xai: "xai",
  google: "gemini",
  gemini: "gemini",
  moonshot: "moonshot",
  moonshotai: "moonshot",
  kimi: "moonshot",
};

const CATALOG_LAB: Record<CountLab, string> = {
  anthropic: "anthropic",
  xai: "xai",
  gemini: "google",
  moonshot: "moonshotai",
};

function foldLab(value: string): CountLab | null {
  return LAB_OF[value.trim().toLowerCase()] ?? null;
}

export function parseModelRef(raw: string): CountTarget | null {
  const token = raw.trim().replace(/^["']|["']$/g, "");
  if (!token || token.startsWith("#")) return null;

  if (token.includes("/")) {
    const slash = token.indexOf("/");
    const lab = foldLab(token.slice(0, slash));
    const sku = token.slice(slash + 1).trim();
    if (!lab || !sku) return null;
    return { lab, sku, catalogId: `${CATALOG_LAB[lab]}/${sku}` };
  }

  const lower = token.toLowerCase();
  const guessed: CountLab | null = lower.startsWith("claude")
    ? "anthropic"
    : lower.startsWith("grok")
      ? "xai"
      : lower.startsWith("gemini")
        ? "gemini"
        : lower.startsWith("kimi") || lower.startsWith("moonshot")
          ? "moonshot"
          : null;
  if (!guessed) return null;
  return { lab: guessed, sku: token, catalogId: `${CATALOG_LAB[guessed]}/${token}` };
}

function pushUnique(out: CountTarget[], target: CountTarget) {
  if (out.some((row) => row.catalogId === target.catalogId)) return;
  out.push(target);
}

function fromStringList(values: unknown, lab?: CountLab): CountTarget[] {
  if (!Array.isArray(values)) return [];
  const out: CountTarget[] = [];
  for (const item of values) {
    if (typeof item !== "string") continue;
    if (lab && !item.includes("/")) {
      pushUnique(out, {
        lab,
        sku: item.trim(),
        catalogId: `${CATALOG_LAB[lab]}/${item.trim()}`,
      });
      continue;
    }
    const parsed = parseModelRef(item);
    if (parsed) pushUnique(out, parsed);
  }
  return out;
}

export function parseCountList(text: string): CountTarget[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const looksYaml =
    trimmed.startsWith("{") ||
    trimmed.startsWith("-") ||
    /^(models|anthropic|xai|google|gemini|moonshot|moonshotai|kimi)\s*:/m.test(trimmed);

  if (looksYaml) {
    let raw: unknown;
    try {
      raw = parseYaml(trimmed);
    } catch {
      raw = null;
    }
    if (Array.isArray(raw)) return fromStringList(raw);
    if (raw && typeof raw === "object") {
      const rec = raw as Record<string, unknown>;
      const out: CountTarget[] = [];
      for (const row of fromStringList(rec.models)) pushUnique(out, row);
      for (const [key, value] of Object.entries(rec)) {
        if (key === "models") continue;
        const lab = foldLab(key);
        if (!lab) continue;
        for (const row of fromStringList(value, lab)) pushUnique(out, row);
      }
      if (out.length > 0) return out;
    }
  }

  const out: CountTarget[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const parsed = parseModelRef(line.split("#")[0] ?? "");
    if (parsed) pushUnique(out, parsed);
  }
  return out;
}

export function mergeCountTargets(...groups: CountTarget[][]): CountTarget[] {
  const out: CountTarget[] = [];
  for (const group of groups) {
    for (const row of group) pushUnique(out, row);
  }
  return out;
}
