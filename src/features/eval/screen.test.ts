import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { screenSubmission } from "./screen";

const active = { reputation: 10, status: "active" as const, rejectCount: 0 };

describe("screenSubmission", () => {
  it("rejects a banned account", () => {
    const report = screenSubmission({
      harnessSlug: "claude",
      sku: "claude-opus-4-6",
      catalogKnown: true,
      user: { ...active, status: "banned" },
      peers: [],
    });
    assert.equal(report.recommend, "reject");
  });

  it("accepts a DeepSeek SKU under Qwen", () => {
    const report = screenSubmission({
      harnessSlug: "qwen",
      sku: "deepseek-v4-flash-0731",
      catalogKnown: true,
      user: active,
      peers: [],
    });
    assert.equal(report.identity, "ok");
    assert.equal(report.recommend, "hold");
  });

  it("rejects a new SKU from a low-reputation user", () => {
    const report = screenSubmission({
      harnessSlug: "claude",
      sku: "claude-opus-4-6",
      catalogKnown: false,
      user: active,
      peers: [],
    });
    assert.equal(report.catalog, "new");
    assert.equal(report.recommend, "reject");
  });

  it("publishes a new SKU from a high-reputation clean account", () => {
    const report = screenSubmission({
      harnessSlug: "claude",
      sku: "claude-opus-4-6",
      catalogKnown: false,
      user: { ...active, reputation: 40 },
      peers: [],
    });
    assert.equal(report.recommend, "publish");
    assert.equal(report.catalog, "new");
  });

  it("holds a clean known SKU from a new account", () => {
    const report = screenSubmission({
      harnessSlug: "claude",
      sku: "claude-opus-4-6",
      catalogKnown: true,
      user: active,
      peers: [],
    });
    assert.equal(report.recommend, "hold");
    assert.equal(report.identity, "ok");
  });

  it("publishes a clean known SKU from a high-reputation account", () => {
    const report = screenSubmission({
      harnessSlug: "claude",
      sku: "claude-opus-4-6",
      catalogKnown: true,
      user: { ...active, reputation: 40 },
      peers: [],
    });
    assert.equal(report.recommend, "publish");
  });

  it("holds a high-reputation user who already has a reject", () => {
    const report = screenSubmission({
      harnessSlug: "claude",
      sku: "claude-opus-4-6",
      catalogKnown: true,
      user: { ...active, reputation: 40, rejectCount: 1 },
      peers: [],
    });
    assert.equal(report.recommend, "hold");
  });
});
