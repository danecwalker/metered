import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const tsx = path.join(root, "node_modules", ".bin", "tsx");
const cli = path.join(root, "cli", "count-basket.ts");

describe("count-basket CLI", () => {
  it("names local tables, lab APIs, and the keys they need", () => {
    const result = spawnSync(tsx, [cli, "--help"], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /count-basket/);
    assert.match(result.stdout, /ANTHROPIC_API_KEY/);
    assert.match(result.stdout, /XAI_API_KEY/);
    assert.match(result.stdout, /GEMINI_API_KEY/);
    assert.match(result.stdout, /MOONSHOT_API_KEY/);
    assert.match(result.stdout, /--cli-auth/);
    assert.match(result.stdout, /count-basket\.yaml/);
    assert.match(result.stdout, /--model/);
    assert.doesNotMatch(result.stdout, /sk-ant-|xai-/);
  });

  it("lists models from the default yaml", () => {
    const result = spawnSync(tsx, [cli, "--list"], {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /cli\/count-basket\.yaml/);
    assert.match(result.stdout, /anthropic\/claude-opus-5/);
    assert.match(result.stdout, /anthropic\/claude-fable-5/);
  });
});
