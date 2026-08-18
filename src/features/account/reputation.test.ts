import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canProposeModel,
  REPUTATION_ADD_MODEL,
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

describe("shouldBan", () => {
  it("bans after enough rejects", () => {
    assert.equal(shouldBan(REJECTS_BEFORE_BAN - 1, "active"), false);
    assert.equal(shouldBan(REJECTS_BEFORE_BAN, "active"), true);
  });
});
