import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAutoPublish,
  canProposeModel,
  REPUTATION_ADD_MODEL,
  REPUTATION_AUTO_PUBLISH,
  REJECTS_BEFORE_BAN,
  shouldBan,
} from "./reputation";

describe("canProposeModel", () => {
  it("requires an active high-reputation account", () => {
    assert.equal(canProposeModel(REPUTATION_ADD_MODEL, "active"), true);
    assert.equal(canProposeModel(REPUTATION_ADD_MODEL - 1, "active"), false);
    assert.equal(canProposeModel(REPUTATION_ADD_MODEL, "banned"), false);
  });
});

describe("canAutoPublish", () => {
  it("requires an active clean account at the auto-publish bar", () => {
    assert.equal(canAutoPublish(REPUTATION_AUTO_PUBLISH, "active", 0), true);
    assert.equal(canAutoPublish(REPUTATION_AUTO_PUBLISH - 1, "active", 0), false);
    assert.equal(canAutoPublish(REPUTATION_AUTO_PUBLISH, "banned", 0), false);
    assert.equal(canAutoPublish(REPUTATION_AUTO_PUBLISH, "active", 1), false);
  });
});

describe("shouldBan", () => {
  it("bans after enough rejects", () => {
    assert.equal(shouldBan(REJECTS_BEFORE_BAN - 1, "active"), false);
    assert.equal(shouldBan(REJECTS_BEFORE_BAN, "active"), true);
  });
});
