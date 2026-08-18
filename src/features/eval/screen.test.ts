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

  it("rejects a Claude SKU under ChatGPT", () => {
    const report = screenSubmission({
      harnessSlug: "chatgpt",
      sku: "claude-opus-4-6",
      catalogKnown: true,
      user: active,
      peers: [],
    });
    assert.equal(report.identity, "bad");
    assert.equal(report.recommend, "reject");
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

  it("holds a new SKU from a high-reputation user for review", () => {
    const report = screenSubmission({
      harnessSlug: "claude",
      sku: "claude-opus-4-6",
      catalogKnown: false,
      user: { ...active, reputation: 40 },
      peers: [],
    });
    assert.equal(report.recommend, "hold");
    assert.equal(report.catalog, "new");
  });

  it("still holds a clean known SKU — nothing auto-posts", () => {
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
});
