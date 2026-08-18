import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { integrityOf } from "./hash";
import lock from "./official-lock.json";
import { OFFICIAL_TASK_COUNT, loadOfficialSuite } from "./suite";
import { WORK_SUITE_VERSION } from "@/features/pricing/math";

describe("official lock", () => {
  it("is the Python suite, three Harbor jobs, hash matches TypeScript integrity", () => {
    assert.equal(lock.suiteVersion, WORK_SUITE_VERSION);
    assert.equal(lock.tasks.length, 3);
    assert.equal(OFFICIAL_TASK_COUNT, 3);
    const body = lock.tasks.map((task) => ({
      id: task.id,
      promptHash: task.promptHash,
      check: task.check,
      expectedKeys: task.expectedKeys,
      expectedJson: task.expectedJson,
      mustInclude: task.mustInclude,
    }));
    assert.equal(integrityOf(body), lock.suiteHash);
  });

  it("loads the same lock the site verifies against", async () => {
    const suite = await loadOfficialSuite();
    assert.equal(suite.suiteHash, lock.suiteHash);
    assert.equal(suite.tasks.length, 3);
  });
});
