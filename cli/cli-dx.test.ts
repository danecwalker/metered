import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const tsx = path.join(root, "node_modules", ".bin", "tsx");
const cli = path.join(root, "cli", "metered-eval.ts");
const effort = "none | low | medium | high | xhigh | max | default";

function run(command: string, args: string[]) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
}

describe("eval CLI dx", () => {
  it("prints a two-step flow with --effort on no args and help", () => {
    for (const args of [[], ["help"], ["--help"]]) {
      const result = run(tsx, [cli, ...args]);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /two steps/);
      assert.match(result.stdout, /npx tsx cli\/metered-eval\.ts init/);
      assert.match(result.stdout, /bash cli\/run\.sh/);
      assert.match(result.stdout, /--effort/);
      assert.match(result.stdout, new RegExp(effort.replace(/ \| /g, " \\| ")));
      assert.match(result.stdout, /Exit codes:/);
      assert.match(result.stdout, /  0  /);
      assert.match(result.stdout, /  1  /);
    }
  });

  it("run.sh without required flags names them and exits non-zero", () => {
    const result = run("bash", ["cli/run.sh"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--model-name/);
    assert.match(result.stderr, /--list-input/);
    assert.match(result.stderr, /--effort high/);
    assert.match(result.stderr, /bash cli\/run\.sh/);
    assert.doesNotMatch(result.stderr, /^\s+at /m);
  });

  it("run.sh --help names the next action and effort levels", () => {
    const result = run("bash", ["cli/run.sh", "--help"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /bash cli\/get\.sh/);
    assert.match(result.stdout, /--model-name/);
    assert.match(result.stdout, /--list-input/);
    assert.match(result.stdout, /--effort/);
    assert.match(result.stdout, new RegExp(effort.replace(/ \| /g, " \\| ")));
    assert.match(result.stdout, /exit 0/);
    assert.match(result.stdout, /exit 1/);
  });

  it("get.sh leaves existing yaml and prints how to overwrite", () => {
    const result = run("bash", ["cli/get.sh"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /already exists/);
    assert.match(result.stderr, /bash cli\/get\.sh --force/);
    assert.match(result.stderr, /METERED_FORCE=1/);
    assert.match(result.stderr, /bash cli\/run\.sh/);
    assert.match(result.stderr, /--effort high/);
  });
});
