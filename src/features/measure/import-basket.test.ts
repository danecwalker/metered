import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BASKET_VERSION } from "@/features/pricing/math";
import {
  catalogQueryOf,
  parseBasketCounts,
  parseBasketCountsText,
  planBasketImport,
  summarizeImportPlan,
  type ImportModelRef,
} from "@/features/measure/import-basket";

const slices = {
  english: { tokens: 100 },
  code: { tokens: 80 },
  structured: { tokens: 70 },
  tools: { tokens: 90 },
  cjk: { tokens: 200 },
  instructions: { tokens: 40 },
};

function file(tokenizers: unknown[]) {
  return { basketVersion: BASKET_VERSION, tokenizers };
}

function model(partial: Partial<ImportModelRef> & Pick<ImportModelRef, "id" | "slug" | "name">): ImportModelRef {
  return {
    catalogId: null,
    labId: null,
    tokenizerKey: "manual",
    skus: [],
    ...partial,
  };
}

describe("parseBasketCounts", () => {
  it("rejects the wrong basket version", () => {
    const parsed = parseBasketCounts({ basketVersion: "other", tokenizers: [] });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /does not match/);
  });

  it("keeps complete ok rows and skips the rest", () => {
    const parsed = parseBasketCounts(
      file([
        { id: "o200k_base", label: "o200k", kind: "local", status: "ok", slices },
        { id: "gemini:x", label: "Gemini", kind: "api", status: "skipped", detail: "no key" },
        { id: "qwen3", status: "ok", slices: { english: { tokens: 1 } } },
      ]),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.tokenizers.length, 1);
    assert.equal(parsed.tokenizers[0].id, "o200k_base");
    assert.equal(parsed.tokenizers[0].measurementSource, "official");
    assert.equal(parsed.skipped.length, 2);
  });

  it("parses pasted text", () => {
    const parsed = parseBasketCountsText(JSON.stringify(file([])));
    assert.equal(parsed.ok, true);
    assert.equal(parseBasketCountsText("{").ok, false);
  });
});

describe("planBasketImport", () => {
  const o200k = {
    id: "o200k_base",
    label: "o200k",
    kind: "local" as const,
    status: "ok",
    slices,
  };
  const sonnet = {
    id: "anthropic:claude-sonnet-4-6",
    label: "Sonnet 4.6",
    kind: "api" as const,
    status: "ok",
    slices,
  };
  const qwen = {
    id: "qwen3",
    label: "Qwen3",
    kind: "local" as const,
    status: "ok",
    slices,
  };

  it("matches encodings by tokenizer key and APIs by catalog id or sku", () => {
    const parsed = parseBasketCounts(file([o200k, sonnet, qwen]));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const plan = planBasketImport(parsed, [
      model({
        id: "gpt",
        slug: "gpt-5.4",
        name: "GPT-5.4",
        labId: "openai",
        tokenizerKey: "o200k_base",
      }),
      model({
        id: "sonnet",
        slug: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        catalogId: "anthropic/claude-sonnet-4-6",
        skus: ["claude-sonnet-4-6"],
      }),
      model({
        id: "qwen-old",
        slug: "qwen2.5-max",
        name: "Qwen2.5 Max",
        catalogId: "alibaba/qwen2.5-max",
      }),
      model({
        id: "qwen-new",
        slug: "qwen3.8-max",
        name: "Qwen3.8 Max",
        catalogId: "alibaba/qwen3.8-max",
      }),
    ]);
    assert.deepEqual(
      plan.assignments.map((row) => [row.model.id, row.tokenizer.id]),
      [
        ["sonnet", "anthropic:claude-sonnet-4-6"],
        ["gpt", "o200k_base"],
        ["qwen-new", "qwen3"],
      ],
    );
    assert.equal(plan.unmatched.length, 0);
  });

  it("lets an exact sku beat a shared tokenizer key", () => {
    const parsed = parseBasketCounts(file([o200k, sonnet]));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const plan = planBasketImport(parsed, [
      model({
        id: "sonnet",
        slug: "claude-sonnet-4-6",
        name: "Sonnet",
        catalogId: "anthropic/claude-sonnet-4-6",
        tokenizerKey: "o200k_base",
        skus: ["claude-sonnet-4-6"],
      }),
    ]);
    assert.equal(plan.assignments.length, 1);
    assert.equal(plan.assignments[0].tokenizer.id, "anthropic:claude-sonnet-4-6");
    assert.match(summarizeImportPlan(plan, false), /Would write 6 slice counts on 1 models/);
  });

  it("opens a models.dev row when the model is not on the board yet", () => {
    const parsed = parseBasketCounts(
      file([
        {
          id: "anthropic:claude-opus-5",
          label: "Claude Opus 5",
          kind: "api",
          status: "ok",
          catalogId: "anthropic/claude-opus-5",
          slices,
        },
      ]),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(catalogQueryOf(parsed.tokenizers[0]), {
      lab: "anthropic",
      sku: "claude-opus-5",
      catalogId: "anthropic/claude-opus-5",
    });
    const plan = planBasketImport(
      parsed,
      [model({ id: "gpt", slug: "gpt-5.4", name: "GPT-5.4", tokenizerKey: "o200k_base" })],
      new Map([
        [
          "anthropic:claude-opus-5",
          {
            catalogId: "anthropic/claude-opus-5",
            name: "Claude Opus 5",
            slug: "claude-opus-5",
            labId: "anthropic",
            sku: "claude-opus-5",
          },
        ],
      ]),
    );
    assert.equal(plan.assignments.length, 1);
    assert.equal(plan.assignments[0].openFromCatalog, true);
    assert.equal(plan.assignments[0].model.catalogId, "anthropic/claude-opus-5");
    assert.match(summarizeImportPlan(plan, false), /Opens from models.dev: Claude Opus 5/);
  });
});
