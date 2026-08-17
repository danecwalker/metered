import { count } from "drizzle-orm";
import { endpoints, measurements, models, type ModelRow } from "@/db/schema";
import type { getDb } from "@/db/client";
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
      listOutput: 10,
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
      listOutput: null,
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
      listOutput: null,
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
      listOutput: null,
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
      listCacheHit: null,
      listCacheWrite: null,
      contextNote: null,
      status: "published",
      sortOrder: 0,
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

export type { ModelRow };
