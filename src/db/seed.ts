import { and, count, eq } from "drizzle-orm";
import { endpoints, measurements, models, submissions, workRuns, type ModelRow } from "@/db/schema";
import type { getDb } from "@/db/client";
import { DEFAULT_ALIASES } from "@/features/catalog/aliases";
import { loadCatalog } from "@/features/catalog/models-dev";
import { resolveCatalogModel } from "@/features/catalog/resolve";
import { loadSlices } from "@/features/basket/load";
import { countNativeTokens } from "@/features/measure/counters";
import type { SliceId, TokenizerKey } from "@/features/pricing/types";

type Db = ReturnType<typeof getDb>;

/**
 * Relative native-token multipliers vs GPT-5.4 from TensorZero,
 * 16 April 2026, on their published corpora. Applied only to slices
 * they measured. Other slices stay empty until counted.
 */
const TENSORZERO_RELATIVE: Record<string, Partial<Record<SliceId, number>>> = {
  "gemini-3.1-pro": {
    english: 1.06,
    structured: (1.18 + 1.11) / 2,
    tools: 1.82,
    instructions: 1.06,
  },
  "claude-sonnet-4.6": {
    english: 1.17,
    structured: (1.25 + 1.22) / 2,
    tools: 2.06,
    instructions: 1.17,
  },
  "claude-opus-4.6": {
    english: 1.17,
    structured: (1.25 + 1.22) / 2,
    tools: 2.06,
    instructions: 1.17,
  },
  "claude-opus-4.7": {
    english: 1.57,
    structured: (1.53 + 1.7) / 2,
    tools: 2.65,
    instructions: 1.57,
  },
};

type SeedModel = {
  id: string;
  slug: string;
  name: string;
  lab: string;
  tokenizerKey: TokenizerKey;
  notes: string;
  endpoint: {
    id: string;
    provider: string;
    sku: string;
    displayName: string;
    listInput: number;
    listOutput: number | null;
    listCacheHit: number | null;
    listCacheWrite: number | null;
  };
};

const SEED_MODELS: SeedModel[] = [
  {
    id: "mdl_gpt54",
    slug: "gpt-5.4",
    name: "GPT-5.4",
    lab: "OpenAI",
    tokenizerKey: "o200k_base",
    notes: "Counted on this basket with the official o200k_base encoding.",
    endpoint: {
      id: "ep_gpt54_openai",
      provider: "OpenAI",
      sku: "gpt-5.4",
      displayName: "OpenAI first-party",
      listInput: 2.5,
      listOutput: 15,
      listCacheHit: 0.25,
      listCacheWrite: 2.5,
    },
  },
  {
    id: "mdl_gemini31",
    slug: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    lab: "Google",
    tokenizerKey: "manual",
    notes: "Fertility estimated from TensorZero (Apr 2026) relative to GPT-5.4. Replace with Google countTokens.",
    endpoint: {
      id: "ep_gemini31_google",
      provider: "Google",
      sku: "gemini-3.1-pro-preview",
      displayName: "Google first-party",
      listInput: 2,
      listOutput: 12,
      listCacheHit: 0.2,
      listCacheWrite: 2,
    },
  },
  {
    id: "mdl_sonnet46",
    slug: "claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    lab: "Anthropic",
    tokenizerKey: "manual",
    notes: "Fertility estimated from TensorZero (Apr 2026) relative to GPT-5.4. Replace with Anthropic count_tokens.",
    endpoint: {
      id: "ep_sonnet46_anthropic",
      provider: "Anthropic",
      sku: "claude-sonnet-4-6",
      displayName: "Anthropic first-party",
      listInput: 3,
      listOutput: 15,
      listCacheHit: 0.3,
      listCacheWrite: 3.75,
    },
  },
  {
    id: "mdl_opus46",
    slug: "claude-opus-4.6",
    name: "Claude Opus 4.6",
    lab: "Anthropic",
    tokenizerKey: "manual",
    notes: "Same tokenizer family as Sonnet 4.6 per TensorZero. Estimated the same way.",
    endpoint: {
      id: "ep_opus46_anthropic",
      provider: "Anthropic",
      sku: "claude-opus-4-6",
      displayName: "Anthropic first-party",
      listInput: 5,
      listOutput: 25,
      listCacheHit: 0.5,
      listCacheWrite: 6.25,
    },
  },
  {
    id: "mdl_opus47",
    slug: "claude-opus-4.7",
    name: "Claude Opus 4.7",
    lab: "Anthropic",
    tokenizerKey: "manual",
    notes: "New Anthropic tokenizer. Estimated from TensorZero (Apr 2026) relative to GPT-5.4.",
    endpoint: {
      id: "ep_opus47_anthropic",
      provider: "Anthropic",
      sku: "claude-opus-4-7",
      displayName: "Anthropic first-party",
      listInput: 5,
      listOutput: 25,
      listCacheHit: 0.5,
      listCacheWrite: 6.25,
    },
  },
  {
    id: "mdl_grok46",
    slug: "grok-4.6",
    name: "Grok 4.6",
    lab: "xAI",
    tokenizerKey: "manual",
    notes:
      "xAI list prices, short-context band (Aug 2026): $2 / $0.50 cached / $6 per 1M. Cache writes bill at the input rate. Thinking is billed as output.",
    endpoint: {
      id: "ep_grok46_xai",
      provider: "xAI",
      sku: "grok-4.6",
      displayName: "xAI first-party",
      listInput: 2,
      listOutput: 6,
      listCacheHit: 0.5,
      listCacheWrite: 2,
    },
  },
];

export async function seedIfEmpty(db?: Db): Promise<void> {
  const { getDb } = await import("@/db/client");
  const database = db ?? getDb();
  const [{ value }] = await database.select({ value: count() }).from(models);
  if (value > 0) return;

  const now = new Date().toISOString();
  const slices = await loadSlices();

  for (const seed of SEED_MODELS) {
    await database.insert(models).values({
      id: seed.id,
      slug: seed.slug,
      name: seed.name,
      lab: seed.lab,
      tokenizerKey: seed.tokenizerKey,
      status: "published",
      notes: seed.notes,
      catalogId: null,
      labId: null,
      createdAt: now,
      updatedAt: now,
    });
    await database.insert(endpoints).values({
      id: seed.endpoint.id,
      modelId: seed.id,
      provider: seed.endpoint.provider,
      sku: seed.endpoint.sku,
      displayName: seed.endpoint.displayName,
      listInput: seed.endpoint.listInput,
      listOutput: seed.endpoint.listOutput,
      listCacheHit: seed.endpoint.listCacheHit,
      listCacheWrite: seed.endpoint.listCacheWrite,
      contextNote: null,
      status: "published",
      sortOrder: 0,
      providerId: null,
      catalogSku: null,
    });
  }

  const gptTokens: Partial<Record<SliceId, number>> = {};
  for (const slice of slices) {
    const nativeTokens = await countNativeTokens("o200k_base", slice.text);
    gptTokens[slice.id] = nativeTokens;
    await database.insert(measurements).values({
      id: `ms_gpt54_${slice.id}`,
      modelId: "mdl_gpt54",
      sliceId: slice.id,
      nativeTokens,
      characterCount: slice.characters,
      source: "official",
      measuredAt: now,
    });
  }

  for (const seed of SEED_MODELS) {
    if (seed.id === "mdl_gpt54") continue;
    const relatives = TENSORZERO_RELATIVE[seed.slug];
    if (!relatives) continue;
    for (const slice of slices) {
      const rel = relatives[slice.id];
      const base = gptTokens[slice.id];
      if (rel == null || base == null) continue;
      await database.insert(measurements).values({
        id: `ms_${seed.slug}_${slice.id}`,
        modelId: seed.id,
        sliceId: slice.id,
        nativeTokens: Math.round(base * rel),
        characterCount: slice.characters,
        source: "estimate",
        measuredAt: now,
      });
    }
  }
}

function endpointValues(seed: SeedModel, modelId: string) {
  return {
    id: seed.endpoint.id,
    modelId,
    provider: seed.endpoint.provider,
    sku: seed.endpoint.sku,
    displayName: seed.endpoint.displayName,
    listInput: seed.endpoint.listInput,
    listOutput: seed.endpoint.listOutput,
    listCacheHit: seed.endpoint.listCacheHit,
    listCacheWrite: seed.endpoint.listCacheWrite,
    contextNote: null as string | null,
    status: "published" as const,
    sortOrder: 0,
    providerId: null as string | null,
    catalogSku: null as string | null,
  };
}

/** Insert any official catalog rows a populated DB is missing (e.g. Grok 4.6). */
export async function ensureOfficialCatalog(db?: Db): Promise<void> {
  const { getDb } = await import("@/db/client");
  const database = db ?? getDb();
  const now = new Date().toISOString();

  for (const seed of SEED_MODELS) {
    const [bySku] = await database
      .select()
      .from(endpoints)
      .where(eq(endpoints.sku, seed.endpoint.sku))
      .limit(1);
    if (bySku) {
      const patch: {
        provider?: string;
        displayName?: string;
        listInput?: number;
        listOutput?: number | null;
        listCacheHit?: number | null;
        listCacheWrite?: number | null;
      } = {};
      if (bySku.listInput === 0) {
        patch.provider = seed.endpoint.provider;
        patch.displayName = seed.endpoint.displayName;
        patch.listInput = seed.endpoint.listInput;
        patch.listOutput = seed.endpoint.listOutput;
      }
      if (bySku.listOutput == null && seed.endpoint.listOutput != null) {
        patch.listOutput = seed.endpoint.listOutput;
      }
      if (bySku.listCacheHit == null && seed.endpoint.listCacheHit != null) {
        patch.listCacheHit = seed.endpoint.listCacheHit;
      }
      if (bySku.listCacheWrite == null && seed.endpoint.listCacheWrite != null) {
        patch.listCacheWrite = seed.endpoint.listCacheWrite;
      }
      if (Object.keys(patch).length > 0) {
        await database.update(endpoints).set(patch).where(eq(endpoints.id, bySku.id));
      }
      const [stub] = await database
        .select()
        .from(models)
        .where(eq(models.id, bySku.modelId))
        .limit(1);
      if (stub && (stub.lab === "Unlisted" || stub.name === seed.endpoint.sku)) {
        await database
          .update(models)
          .set({
            name: seed.name,
            lab: seed.lab,
            notes: seed.notes,
            updatedAt: now,
          })
          .where(eq(models.id, stub.id));
      }
      continue;
    }

    const [existing] = await database
      .select()
      .from(models)
      .where(eq(models.slug, seed.slug))
      .limit(1);
    if (!existing) {
      await database.insert(models).values({
        id: seed.id,
        slug: seed.slug,
        name: seed.name,
        lab: seed.lab,
        tokenizerKey: seed.tokenizerKey,
        status: "published",
        notes: seed.notes,
        createdAt: now,
        updatedAt: now,
      });
      await database.insert(endpoints).values(endpointValues(seed, seed.id));
      continue;
    }

    await database.insert(endpoints).values({
      ...endpointValues(seed, existing.id),
      id: seed.endpoint.id,
    });
  }

  await attachCatalogMetadata(database);
}

async function attachCatalogMetadata(database: Db): Promise<void> {
  const catalog = await loadCatalog({ timeoutMs: 4000 });
  const now = new Date().toISOString();
  for (const seed of SEED_MODELS) {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: seed.endpoint.sku,
      provider: seed.endpoint.provider,
      lab: seed.lab,
    });
    if (!match) continue;
    const [ep] = await database
      .select()
      .from(endpoints)
      .where(eq(endpoints.sku, seed.endpoint.sku))
      .limit(1);
    if (!ep) continue;
    await database
      .update(models)
      .set({
        catalogId: match.modelId,
        labId: match.labId,
        name: match.modelName,
        lab: match.labName,
        updatedAt: now,
      })
      .where(eq(models.id, ep.modelId));
    await database
      .update(endpoints)
      .set({
        provider: match.providerName,
        displayName: match.providerName,
        listInput: match.listInput || ep.listInput,
        listOutput: match.listOutput ?? ep.listOutput,
        listCacheHit: match.listCacheHit ?? ep.listCacheHit,
        listCacheWrite: match.listCacheWrite ?? ep.listCacheWrite,
        contextNote: match.contextNote ?? ep.contextNote,
        providerId: match.providerId,
        catalogSku: match.sku,
      })
      .where(eq(endpoints.id, ep.id));
  }
}

/** Fill attempts and wall time on older packages that predate those columns. */
export async function backfillRunClock(db?: Db): Promise<void> {
  const { getDb } = await import("@/db/client");
  const { clockFromPackage, parseEvalPackage } = await import("@/features/eval/package");
  const database = db ?? getDb();
  const rows = await database.select().from(submissions);
  for (const row of rows) {
    if (row.attempts != null && row.durationMs != null) continue;
    let clock: { attempts: number; durationMs: number | null };
    try {
      clock = clockFromPackage(parseEvalPackage(JSON.parse(row.packageJson)));
    } catch {
      continue;
    }
    const attempts = row.attempts ?? (clock.attempts > 0 ? clock.attempts : null);
    const durationMs = row.durationMs ?? clock.durationMs;
    await database
      .update(submissions)
      .set({ attempts, durationMs })
      .where(eq(submissions.id, row.id));
    if (row.status !== "published") continue;
    const [model] = await database
      .select()
      .from(models)
      .where(eq(models.slug, row.modelSlug))
      .limit(1);
    if (!model) continue;
    await database
      .update(workRuns)
      .set({ attempts, durationMs })
      .where(
        and(
          eq(workRuns.modelId, model.id),
          eq(workRuns.harnessId, row.harnessId),
          eq(workRuns.setting, row.setting),
        ),
      );
  }
}

export type { ModelRow };
