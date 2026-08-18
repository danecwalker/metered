import { parse as parseYaml } from "yaml";

export type CountTarget = {
  lab: string;
  sku: string;
  catalogId: string;
};

const BARE_LAB: Record<string, string> = {
  claude: "anthropic",
  grok: "xai",
  gemini: "google",
  kimi: "moonshotai",
  moonshot: "moonshotai",
  qwen: "alibaba",
  deepseek: "deepseek",
  llama: "meta",
  mistral: "mistral",
  gemma: "google",
};

export function parseModelRef(raw: string): CountTarget | null {
  const token = raw.trim().replace(/^["']|["']$/g, "");
  if (!token || token.startsWith("#")) return null;

  if (token.includes("/")) {
    const slash = token.indexOf("/");
    const lab = token.slice(0, slash).trim().toLowerCase();
    const sku = token.slice(slash + 1).trim();
    if (!lab || !sku) return null;
    return { lab, sku, catalogId: `${lab}/${sku}` };
  }

  const lower = token.toLowerCase();
  const guessed = Object.entries(BARE_LAB).find(([prefix]) => lower.startsWith(prefix))?.[1];
  if (!guessed) return null;
  return { lab: guessed, sku: token, catalogId: `${guessed}/${token}` };
}

function pushUnique(out: CountTarget[], target: CountTarget) {
  if (out.some((row) => row.catalogId === target.catalogId)) return;
  out.push(target);
}

function fromStringList(values: unknown, lab?: string): CountTarget[] {
  if (!Array.isArray(values)) return [];
  const out: CountTarget[] = [];
  for (const item of values) {
    if (typeof item !== "string") continue;
    if (lab && !item.includes("/")) {
      const sku = item.trim();
      if (sku) pushUnique(out, { lab, sku, catalogId: `${lab}/${sku}` });
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

  try {
    const raw = parseYaml(trimmed);
    if (Array.isArray(raw)) {
      const rows = fromStringList(raw);
      if (rows.length > 0) return rows;
    } else if (raw && typeof raw === "object") {
      const rec = raw as Record<string, unknown>;
      const out: CountTarget[] = [];
      for (const row of fromStringList(rec.models)) pushUnique(out, row);
      for (const [key, value] of Object.entries(rec)) {
        if (key === "models") continue;
        const lab = key.trim().toLowerCase();
        if (!lab || lab.startsWith("#")) continue;
        for (const row of fromStringList(value, lab)) pushUnique(out, row);
      }
      if (out.length > 0) return out;
    }
  } catch {
    // plain text list
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
