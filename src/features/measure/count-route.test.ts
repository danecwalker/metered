import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Catalog, ModelMetadata } from "@opencode-ai/models";
import { huggingfaceRepo, routeCountTarget } from "@/features/measure/count-route";

function meta(partial: Pick<ModelMetadata, "id" | "name"> & Partial<ModelMetadata>): ModelMetadata {
  return {
    description: partial.name,
    attachment: false,
    reasoning: false,
    tool_call: true,
    temperature: true,
    release_date: "2026-01-01",
    last_updated: "2026-01-01",
    modalities: { input: ["text"], output: ["text"] },
    open_weights: false,
    ...partial,
  };
}

function catalogOf(...models: ModelMetadata[]): Catalog {
  return {
    providers: {},
    models: Object.fromEntries(models.map((model) => [model.id, model])),
  } as Catalog;
}

describe("routeCountTarget", () => {
  it("counts open-weight models locally before any lab API", () => {
    const catalog = catalogOf(
      meta({
        id: "deepseek/deepseek-v4-flash-0731",
        name: "DeepSeek V4 Flash 0731",
        open_weights: true,
        weights: [{ label: "Hugging Face", url: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731" }],
      }),
    );
    const route = routeCountTarget(
      { lab: "deepseek", sku: "deepseek-v4-flash-0731", catalogId: "deepseek/deepseek-v4-flash-0731" },
      catalog,
    );
    assert.equal(route.via, "local");
    if (route.via === "local") {
      assert.equal(route.repo, "deepseek-ai/DeepSeek-V4-Flash-0731");
    }
  });

  it("uses a lab count API only when the model is not local", () => {
    const catalog = catalogOf(
      meta({ id: "anthropic/claude-opus-5", name: "Claude Opus 5", open_weights: false }),
    );
    const route = routeCountTarget(
      { lab: "anthropic", sku: "claude-opus-5", catalogId: "anthropic/claude-opus-5" },
      catalog,
    );
    assert.deepEqual(route.via, "api");
    if (route.via === "api") assert.equal(route.lab, "anthropic");
  });
});

describe("huggingfaceRepo", () => {
  it("reads the Hub path from a weights URL", () => {
    assert.equal(
      huggingfaceRepo({
        weights: [{ url: "https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731" }],
      }),
      "deepseek-ai/DeepSeek-V4-Flash-0731",
    );
    assert.equal(huggingfaceRepo({ weights: [] }), null);
  });
});
