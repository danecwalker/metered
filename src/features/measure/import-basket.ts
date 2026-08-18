import { z } from "zod";
import { SLICES } from "@/features/basket/slices";
import { BASKET_VERSION } from "@/features/pricing/math";
import type { MeasurementSource, SliceId, TokenizerKey } from "@/features/pricing/types";

const SLICE_IDS = SLICES.map((slice) => slice.id) as SliceId[];

const sliceCountSchema = z.object({
  tokens: z.number().int().nonnegative(),
});

const tokenizerSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  kind: z.enum(["local", "api"]).optional(),
  source: z.string().optional(),
  status: z.string(),
  detail: z.string().optional(),
  catalogId: z.string().optional(),
  sku: z.string().optional(),
  slices: z.record(z.string(), sliceCountSchema).optional(),
});

const basketFileSchema = z.object({
  basketVersion: z.string(),
  countedAt: z.string().optional(),
  tokenizers: z.array(tokenizerSchema),
});

export type ImportableTokenizer = {
  id: string;
  label: string;
  kind: "local" | "api";
  source: string;
  catalogId: string | null;
  sku: string | null;
  measurementSource: MeasurementSource;
  tokenizerKey: TokenizerKey;
  slices: { sliceId: SliceId; nativeTokens: number }[];
};

export type ImportModelRef = {
  id: string;
  slug: string;
  name: string;
  catalogId: string | null;
  labId: string | null;
  tokenizerKey: TokenizerKey;
  skus: string[];
};

export type ImportAssignment = {
  model: ImportModelRef;
  tokenizer: ImportableTokenizer;
  reason: string;
  openFromCatalog: boolean;
};

export type CatalogHint = {
  catalogId: string;
  name: string;
  slug: string;
  labId: string;
  sku: string;
};

export type BasketImportPlan = {
  basketVersion: string;
  countedAt: string | null;
  assignments: ImportAssignment[];
  unmatched: { tokenizer: ImportableTokenizer; reason: string }[];
  skipped: { id: string; label: string; reason: string }[];
};

const FAMILY_NEEDLES: Record<string, string[]> = {
  qwen3: ["qwen3"],
  "deepseek-v3": ["deepseek-v3", "deepseek-v3.1", "deepseek-v3.2"],
  "llama-3.1": ["llama-3.1", "llama3.1"],
  mistral: ["mistral"],
  "gemma-2": ["gemma-2", "gemma2"],
};

function fold(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

function haystackOf(model: ImportModelRef): string {
  return [
    model.catalogId ?? "",
    model.slug,
    model.name,
    model.labId ?? "",
    ...model.skus,
  ]
    .map(fold)
    .join(" ");
}

function catalogModelId(catalogId: string | null): string {
  if (!catalogId) return "";
  const parts = catalogId.split("/");
  return fold(parts[parts.length - 1] ?? "");
}

function skuFromTokenizerId(id: string): string | null {
  const parts = id.split(":");
  if (parts.length < 2) return null;
  const sku = parts[parts.length - 1];
  if (sku === "o200k_base" || sku === "cl100k_base") return null;
  return sku;
}

const COUNT_LAB_TO_CATALOG: Record<string, string> = {
  anthropic: "anthropic",
  xai: "xai",
  gemini: "google",
  moonshot: "moonshotai",
};

/** Turn `anthropic:claude-opus-5` or `deepseek/deepseek-v4-flash-0731` into a models.dev lookup. */
export function catalogQueryOf(
  tokenizer: Pick<ImportableTokenizer, "id" | "catalogId" | "sku">,
): { lab: string; sku: string; catalogId: string } | null {
  if (tokenizer.catalogId?.includes("/")) {
    const lab = tokenizer.catalogId.slice(0, tokenizer.catalogId.indexOf("/"));
    const sku = tokenizer.catalogId.slice(lab.length + 1);
    return { lab, sku, catalogId: tokenizer.catalogId };
  }
  if (tokenizer.id.includes("/")) {
    const lab = tokenizer.id.slice(0, tokenizer.id.indexOf("/"));
    const sku = tokenizer.id.slice(lab.length + 1);
    return { lab, sku, catalogId: tokenizer.id };
  }
  const sku = tokenizer.sku ?? skuFromTokenizerId(tokenizer.id);
  if (!sku) return null;
  const prefix = tokenizer.id.includes(":") ? tokenizer.id.slice(0, tokenizer.id.indexOf(":")) : "";
  const lab = COUNT_LAB_TO_CATALOG[prefix] ?? (prefix || null);
  if (!lab) return null;
  return { lab, sku, catalogId: `${lab}/${sku}` };
}

function tokenizerKeyOf(id: string): TokenizerKey {
  if (id === "o200k_base" || id === "cl100k_base") return id;
  return "manual";
}

function measurementSourceOf(row: z.infer<typeof tokenizerSchema>): MeasurementSource {
  if (row.id === "o200k_base" || row.id === "cl100k_base") return "official";
  if (row.kind === "api") return "official";
  return "estimate";
}

function slicesOf(row: z.infer<typeof tokenizerSchema>): { sliceId: SliceId; nativeTokens: number }[] | null {
  const slices = row.slices ?? {};
  const out: { sliceId: SliceId; nativeTokens: number }[] = [];
  for (const sliceId of SLICE_IDS) {
    const count = slices[sliceId];
    if (!count) return null;
    out.push({ sliceId, nativeTokens: count.tokens });
  }
  return out;
}

export function parseBasketCounts(raw: unknown):
  | { ok: true; basketVersion: string; countedAt: string | null; tokenizers: ImportableTokenizer[]; skipped: BasketImportPlan["skipped"] }
  | { ok: false; error: string } {
  const parsed = basketFileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "That file is not a count-basket JSON export." };
  }
  if (parsed.data.basketVersion !== BASKET_VERSION) {
    return {
      ok: false,
      error: `Basket ${parsed.data.basketVersion} does not match this index (${BASKET_VERSION}).`,
    };
  }

  const tokenizers: ImportableTokenizer[] = [];
  const skipped: BasketImportPlan["skipped"] = [];
  for (const row of parsed.data.tokenizers) {
    const label = row.label ?? row.id;
    if (row.status !== "ok") {
      skipped.push({
        id: row.id,
        label,
        reason: row.detail?.trim() || row.status,
      });
      continue;
    }
    const slices = slicesOf(row);
    if (!slices) {
      skipped.push({ id: row.id, label, reason: "missing one or more slice counts" });
      continue;
    }
    tokenizers.push({
      id: row.id,
      label,
      kind: row.kind ?? "local",
      source: row.source ?? row.id,
      catalogId: row.catalogId ?? catalogQueryOf({ id: row.id, catalogId: row.catalogId ?? null, sku: row.sku ?? null })?.catalogId ?? null,
      sku: row.sku ?? skuFromTokenizerId(row.id),
      measurementSource: measurementSourceOf(row),
      tokenizerKey: tokenizerKeyOf(row.id),
      slices,
    });
  }

  return {
    ok: true,
    basketVersion: parsed.data.basketVersion,
    countedAt: parsed.data.countedAt ?? null,
    tokenizers,
    skipped,
  };
}

export function parseBasketCountsText(text: string): ReturnType<typeof parseBasketCounts> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Paste or drop the count-basket JSON." };
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "That is not valid JSON." };
  }
  return parseBasketCounts(raw);
}

type Scored = { model: ImportModelRef; score: number; reason: string };

function scoreModel(tokenizer: ImportableTokenizer, model: ImportModelRef): Scored | null {
  if (tokenizer.catalogId && model.catalogId && fold(tokenizer.catalogId) === fold(model.catalogId)) {
    return { model, score: 4, reason: `catalog ${model.catalogId}` };
  }
  const sku = tokenizer.sku ?? skuFromTokenizerId(tokenizer.id);
  if (sku) {
    const folded = fold(sku);
    if (catalogModelId(model.catalogId) === folded) {
      return { model, score: 3, reason: `catalog ${model.catalogId}` };
    }
    if (model.skus.some((value) => fold(value) === folded)) {
      return { model, score: 3, reason: `sku ${sku}` };
    }
    if (fold(model.slug) === folded) {
      return { model, score: 3, reason: `slug ${model.slug}` };
    }
  }

  const needles = FAMILY_NEEDLES[tokenizer.id];
  if (needles) {
    const hay = haystackOf(model);
    const hit = needles.find((needle) => hay.includes(fold(needle)));
    if (hit) return { model, score: 2, reason: `family ${hit}` };
  }

  if (
    (tokenizer.id === "o200k_base" || tokenizer.id === "cl100k_base") &&
    model.tokenizerKey === tokenizer.id
  ) {
    return { model, score: 1, reason: `tokenizer ${tokenizer.id}` };
  }

  return null;
}

export function planBasketImport(
  parsed: Extract<ReturnType<typeof parseBasketCounts>, { ok: true }>,
  models: ImportModelRef[],
  catalogHints: Map<string, CatalogHint> = new Map(),
): BasketImportPlan {
  const claimed = new Map<string, ImportAssignment>();

  for (const tokenizer of parsed.tokenizers) {
    const hits = models
      .map((model) => scoreModel(tokenizer, model))
      .filter((row): row is Scored => row != null)
      .sort((left, right) => right.score - left.score || left.model.slug.localeCompare(right.model.slug));

    for (const hit of hits) {
      const existing = claimed.get(hit.model.id);
      if (existing) {
        const existingScore = scoreModel(existing.tokenizer, hit.model)?.score ?? 0;
        if (existingScore >= hit.score) continue;
      }
      claimed.set(hit.model.id, {
        model: hit.model,
        tokenizer,
        reason: hit.reason,
        openFromCatalog: false,
      });
    }
  }

  const assignedIds = new Set(
    [...claimed.values()].map((row) => row.tokenizer.id),
  );
  const unmatched: BasketImportPlan["unmatched"] = [];

  for (const tokenizer of parsed.tokenizers) {
    if (assignedIds.has(tokenizer.id)) continue;
    const hint = catalogHints.get(tokenizer.id);
    if (!hint) {
      unmatched.push({
        tokenizer,
        reason: "no model or models.dev id matches this tokenizer",
      });
      continue;
    }
    const already = models.find((model) => model.catalogId && fold(model.catalogId) === fold(hint.catalogId));
    if (already) {
      claimed.set(already.id, {
        model: already,
        tokenizer,
        reason: `catalog ${already.catalogId}`,
        openFromCatalog: false,
      });
      continue;
    }
    claimed.set(`catalog:${hint.catalogId}`, {
      model: {
        id: "",
        slug: hint.slug,
        name: hint.name,
        catalogId: hint.catalogId,
        labId: hint.labId,
        tokenizerKey: "manual",
        skus: [hint.sku],
      },
      tokenizer,
      reason: `models.dev ${hint.catalogId}`,
      openFromCatalog: true,
    });
  }

  return {
    basketVersion: parsed.basketVersion,
    countedAt: parsed.countedAt,
    assignments: [...claimed.values()].sort((left, right) =>
      left.model.name.localeCompare(right.model.name),
    ),
    unmatched,
    skipped: parsed.skipped,
  };
}

export function summarizeImportPlan(plan: BasketImportPlan, applied: boolean): string {
  const parts: string[] = [];
  if (plan.assignments.length === 0) {
    parts.push("No existing models matched the counted tokenizers.");
  } else if (applied) {
    parts.push(
      `Wrote ${plan.assignments.length * SLICES.length} slice counts on ${plan.assignments.length} models.`,
    );
  } else {
    parts.push(
      `Would write ${plan.assignments.length * SLICES.length} slice counts on ${plan.assignments.length} models.`,
    );
  }
  if (plan.assignments.length > 0) {
    parts.push(
      plan.assignments
        .map((row) => `${row.model.name} ← ${row.tokenizer.label} (${row.reason})`)
        .join("; ") + ".",
    );
  }
  const opening = plan.assignments.filter((row) => row.openFromCatalog);
  if (opening.length > 0) {
    parts.push(
      `Opens from models.dev: ${opening.map((row) => row.model.name).join(", ")}.`,
    );
  }
  if (plan.unmatched.length > 0) {
    parts.push(
      `Unmatched: ${plan.unmatched.map((row) => row.tokenizer.label).join(", ")}.`,
    );
  }
  if (plan.skipped.length > 0) {
    parts.push(
      `Skipped: ${plan.skipped.map((row) => `${row.label} (${row.reason})`).join(", ")}.`,
    );
  }
  return parts.join(" ");
}
