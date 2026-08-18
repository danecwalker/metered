import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Catalog, Model, ModelMetadata, Provider } from "@opencode-ai/models";
import { DEFAULT_ALIASES, guessLabId } from "@/features/catalog/aliases";
import {
  detectProviderId,
  listCatalogLabs,
  offeringsForModel,
  resolveCatalogModel,
  skuCandidates,
  tokenizerForLab,
} from "@/features/catalog/resolve";

function meta(partial: Pick<ModelMetadata, "id" | "name"> & Partial<ModelMetadata>): ModelMetadata {
  return {
    description: partial.description ?? partial.name,
    ...partial,
  };
}

function offered(
  id: string,
  name: string,
  cost?: Model["cost"],
): Model {
  return {
    id,
    name,
    description: name,
    attachment: false,
    reasoning: true,
    tool_call: true,
    release_date: "2026-01-01",
    last_updated: "2026-01-01",
    modalities: { input: ["text"], output: ["text"] },
    open_weights: false,
    limit: { context: 200000, output: 32000 },
    cost,
  };
}

function provider(
  id: string,
  name: string,
  models: Record<string, Model>,
  api?: string,
): Provider {
  return { id, env: [], npm: "@ai-sdk/openai-compatible", name, doc: "https://example.com", api, models };
}

const catalog: Catalog = {
  models: {
    "alibaba/qwen3.8-max": meta({ id: "alibaba/qwen3.8-max", name: "Qwen3.8 Max" }),
    "anthropic/claude-opus-4-6": meta({ id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6" }),
    "openai/gpt-5.4": meta({ id: "openai/gpt-5.4", name: "GPT-5.4" }),
    "xai/grok-4.6": meta({ id: "xai/grok-4.6", name: "Grok 4.6" }),
    "deepseek/deepseek-v4-flash-0731": meta({
      id: "deepseek/deepseek-v4-flash-0731",
      name: "DeepSeek V4 Flash 0731",
    }),
  },
  providers: {
    alibaba: provider("alibaba", "Alibaba", {
      "qwen3.8-max": offered("qwen3.8-max", "Qwen3.8 Max", { input: 0.5, output: 2 }),
    }),
    anthropic: provider("anthropic", "Anthropic", {
      "claude-opus-4-6": offered("claude-opus-4-6", "Claude Opus 4.6", {
        input: 5,
        output: 25,
        cache_read: 0.5,
        cache_write: 6.25,
      }),
    }),
    openai: provider("openai", "OpenAI", {
      "gpt-5.4": offered("gpt-5.4", "GPT-5.4", { input: 2.5, output: 15, cache_read: 0.25 }),
    }),
    xai: provider("xai", "xAI", {
      "grok-4.6": offered("grok-4.6", "Grok 4.6", { input: 2, output: 6, cache_read: 0.5 }),
    }),
    openrouter: provider(
      "openrouter",
      "OpenRouter",
      {
        "anthropic/claude-opus-4-6": offered("anthropic/claude-opus-4-6", "Claude Opus 4.6", {
          input: 6,
          output: 30,
        }),
        "deepseek/deepseek-v4-flash-0731": offered(
          "deepseek/deepseek-v4-flash-0731",
          "DeepSeek V4 Flash 0731",
          { input: 0.14, output: 0.28 },
        ),
      },
      "https://openrouter.ai/api/v1",
    ),
    cortecs: provider(
      "cortecs",
      "Cortecs",
      {
      "deepseek-v4-flash-0731": offered("deepseek-v4-flash-0731", "DeepSeek V4 Flash 0731", {
        input: 0.13,
        output: 0.28,
      }),
    }),
    deepseek: provider("deepseek", "DeepSeek", {
      "deepseek-v4-flash-0731": offered("deepseek-v4-flash-0731", "DeepSeek V4 Flash 0731", {
        input: 0.14,
        output: 0.28,
      }),
    }),
  },
};

describe("skuCandidates", () => {
  it("keeps dotted OpenAI ids and adds a dashed variant", () => {
    assert.deepEqual(skuCandidates("gpt-5.4"), ["gpt-5.4", "gpt-5-4"]);
    assert.ok(skuCandidates("claude-opus-4.6").includes("claude-opus-4-6"));
  });
});

describe("resolveCatalogModel", () => {
  it("maps a Qwen harness SKU onto Alibaba", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "qwen3.8-max",
      harnessSlug: "qwen",
    });
    assert.ok(match);
    assert.equal(match.modelId, "alibaba/qwen3.8-max");
    assert.equal(match.labId, "alibaba");
    assert.equal(match.labName, "Alibaba");
    assert.equal(match.providerId, "alibaba");
    assert.equal(match.listInput, 0.5);
    assert.equal(match.listOutput, 2);
  });

  it("accepts dotted Anthropic SKUs", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "claude-opus-4.6",
      harnessSlug: "claude",
    });
    assert.ok(match);
    assert.equal(match.sku, "claude-opus-4-6");
    assert.equal(match.providerId, "anthropic");
    assert.equal(match.listCacheHit, 0.5);
  });

  it("does not smash gpt-5.4 into gpt-5-4", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "gpt-5.4",
      provider: "openai",
    });
    assert.ok(match);
    assert.equal(match.sku, "gpt-5.4");
    assert.equal(match.listInput, 2.5);
  });

  it("prefers the hinted provider when several offer the same model", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "anthropic/claude-opus-4-6",
      provider: "OpenRouter",
    });
    assert.ok(match);
    assert.equal(match.providerId, "openrouter");
    assert.equal(match.listInput, 6);
  });

  it("uses a first-party endpoint when the harness is the lab", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "claude-opus-4-6",
      harnessSlug: "claude",
    });
    assert.ok(match);
    assert.equal(match.providerId, "anthropic");
    assert.equal(match.listInput, 5);
  });

  it("lets an admin SKU alias win", () => {
    const match = resolveCatalogModel(
      catalog,
      [...DEFAULT_ALIASES, { kind: "sku", source: "opus", target: "anthropic/claude-opus-4-6" }],
      { sku: "opus", provider: "anthropic" },
    );
    assert.ok(match);
    assert.equal(match.modelId, "anthropic/claude-opus-4-6");
  });

  it("matches a unique display name", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      modelName: "Grok 4.6",
      harnessSlug: "grok",
    });
    assert.ok(match);
    assert.equal(match.modelId, "xai/grok-4.6");
  });

  it("returns null for an unknown SKU", () => {
    assert.equal(
      resolveCatalogModel(catalog, DEFAULT_ALIASES, { sku: "not-a-real-model", harnessSlug: "api" }),
      null,
    );
  });

  it("takes lab from models.dev metadata, not the first host", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "deepseek-v4-flash-0731",
    });
    assert.ok(match);
    assert.equal(match.modelId, "deepseek/deepseek-v4-flash-0731");
    assert.equal(match.labId, "deepseek");
    assert.equal(match.labName, "DeepSeek");
    assert.equal(match.providerId, "deepseek");
    assert.ok(match.offerings.some((item) => item.providerId === "cortecs"));
    assert.ok(match.offerings.some((item) => item.providerId === "deepseek" && item.firstParty));
  });

  it("lists every host even when they share the same SKU", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "deepseek-v4-flash-0731",
    });
    assert.ok(match);
    const ids = match.offerings.map((item) => item.providerId);
    assert.ok(ids.includes("cortecs"));
    assert.ok(ids.includes("deepseek"));
    assert.ok(
      match.offerings.filter((item) => item.sku === "deepseek-v4-flash-0731" || item.sku.endsWith("deepseek-v4-flash-0731")).length >= 2,
    );
  });

  it("keeps lab DeepSeek when the run named Cortecs", () => {
    const match = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
      sku: "deepseek-v4-flash-0731",
      provider: "cortecs",
      lab: "Cortecs",
    });
    assert.ok(match);
    assert.equal(match.labId, "deepseek");
    assert.equal(match.providerId, "cortecs");
  });
});

describe("detectProviderId", () => {
  it("uses the product CLI as first-party, not a random host", () => {
    assert.equal(
      detectProviderId(catalog, DEFAULT_ALIASES, {
        sku: "deepseek-v4-flash-0731",
        harnessSlug: "deepseek",
      }),
      "deepseek",
    );
    assert.equal(
      detectProviderId(catalog, DEFAULT_ALIASES, {
        sku: "claude-opus-4-6",
        harnessSlug: "claude",
      }),
      "anthropic",
    );
  });

  it("uses the API base URL when the harness is a generic API", () => {
    assert.equal(
      detectProviderId(catalog, DEFAULT_ALIASES, {
        sku: "deepseek-v4-flash-0731",
        harnessSlug: "api",
        baseUrl: "https://openrouter.ai/api/v1",
      }),
      "openrouter",
    );
  });

  it("does not invent Cortecs just because that host lists the SKU", () => {
    assert.equal(
      detectProviderId(catalog, DEFAULT_ALIASES, {
        sku: "deepseek-v4-flash-0731",
        harnessSlug: "api",
      }),
      "openrouter",
    );
  });
});

describe("offeringsForModel", () => {
  it("keeps Alibaba and Cortecs as separate endpoints", () => {
    const withAlibaba = {
      ...catalog,
      providers: {
        ...catalog.providers,
        alibaba: provider("alibaba", "Alibaba", {
          "deepseek-v4-flash-0731": offered("deepseek-v4-flash-0731", "DeepSeek V4 Flash 0731", {
            input: 0.2,
            output: 0.4,
          }),
        }),
      },
    };
    const offerings = offeringsForModel(
      withAlibaba,
      withAlibaba.models["deepseek/deepseek-v4-flash-0731"],
    );
    assert.ok(offerings.some((item) => item.providerId === "alibaba" && item.listInput === 0.2));
    assert.ok(offerings.some((item) => item.providerId === "cortecs" && item.listInput === 0.13));
  });
});

describe("listCatalogLabs", () => {
  it("lists labs from model ids, not hosts", () => {
    const labs = listCatalogLabs(catalog);
    assert.ok(labs.some((lab) => lab.id === "deepseek" && lab.name === "DeepSeek"));
    assert.ok(!labs.some((lab) => lab.id === "cortecs"));
  });
});

describe("tokenizerForLab", () => {
  it("uses o200k for OpenAI and manual otherwise", () => {
    assert.equal(tokenizerForLab("openai"), "o200k_base");
    assert.equal(tokenizerForLab("alibaba"), "manual");
  });
});

describe("guessLabId", () => {
  it("maps Qwen and xAI display names onto models.dev lab ids", () => {
    assert.equal(guessLabId("Qwen"), "alibaba");
    assert.equal(guessLabId("xAI"), "xai");
    assert.equal(guessLabId("Alibaba"), "alibaba");
    assert.equal(guessLabId("OpenAI", "openai"), "openai");
  });
});
