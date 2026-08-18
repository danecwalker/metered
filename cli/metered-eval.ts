#!/usr/bin/env npx tsx
import { access, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { detectHarnesses, renderEvalYaml } from "./generate-yaml";
import { DEFAULT_ALIASES } from "@/features/catalog/aliases";
import { loadCatalog } from "@/features/catalog/models-dev";
import { resolveCatalogModel } from "@/features/catalog/resolve";
import { parseEffort } from "@/features/eval/effort";
import { driverFromConfig } from "./harness-drivers";
import { loadEvalConfig } from "./load-config";
import { lockfileOf, parseEvalPackage } from "@/features/eval/package";
import { runLocalEval } from "@/features/eval/run-local";
import { loadOfficialSuite } from "@/features/eval/suite";
import { verifyPackage } from "@/features/eval/verify";

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]) {
  const flags: Flags = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return { flags, rest };
}

function str(flags: Flags, key: string, fallback = ""): string {
  const value = flags[key];
  return typeof value === "string" ? value : fallback;
}

function num(flags: Flags, key: string): number | null {
  const value = flags[key];
  if (typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const EFFORT_LEVELS = "none | low | medium | high | xhigh | max | default";

const NEXT_INIT = "bash cli/get.sh";
const NEXT_RUN =
  'bash cli/run.sh --harness <name> --effort high --model-name "…" --list-input 3 --list-output 15';

function help(): string {
  return `metered-eval — two steps: write yaml, then run the official suite.

1  write metered-eval.yaml from the CLIs on this machine
   ${NEXT_INIT}
   # or: npx tsx cli/metered-eval.ts init

2  run the official suite (requires --model-name; prices come from models.dev when the SKU is known)
   ${NEXT_RUN}

--effort          ${EFFORT_LEVELS}

Other commands:
  init [--out file] [--force] [--examples]
  suite
  harnesses [--config file]
  verify <file>
  run --harness <name-from-yaml> [flags]
  help

Config (first found):
  --config path.yaml
  ./metered-eval.yaml
  ./cli/metered-eval.yaml

run flags:
  --harness       key from the YAML file
  --model-name    required — display name
  --lab
  --provider
  --sku
  --model-id      substituted as {model}
  --effort        ${EFFORT_LEVELS}
  --setting       alias of --effort
  --list-input    $/M input (optional if models.dev knows the SKU)
  --list-output   $/M output
  --max-attempts  retry budget per task (default from YAML, else 3)
  --base-url      api harness
  --api-key       or OPENROUTER_API_KEY / OPENAI_API_KEY
  --bin           replace argv[0]
  --out           write path

Exit codes:
  0  ok (help, init, run sealed, yaml already present)
  1  usage or runtime error
  2  verify failed

Add ChatGPT, Claude, Grok, Qwen, or anything else by editing the YAML.
Keys never leave this machine. Upload the sealed file at /eval.
`;
}

async function main() {
  const { flags, rest } = parseArgs(process.argv.slice(2));
  const command = rest[0];
  if (!command || command === "help" || flags.help) {
    process.stdout.write(help());
    return;
  }

  const root = process.cwd();

  if (command === "init") {
    const dest = path.resolve(str(flags, "out", "metered-eval.yaml"));
    const exists = await fileExists(dest);
    if (exists && !flags.force) {
      process.stderr.write(`${dest} already exists.\n`);
      process.stderr.write(
        "overwrite: npx tsx cli/metered-eval.ts init --force\n",
      );
      process.stderr.write("       or: bash cli/get.sh --force\n");
      process.stderr.write("       or: METERED_FORCE=1 bash cli/get.sh\n");
      process.stderr.write(`next: ${NEXT_RUN}\n`);
      return;
    }
    const found = detectHarnesses();
    const yaml = renderEvalYaml({
      ...found,
      includeMissing: Boolean(flags.examples),
    });
    await writeFile(dest, yaml, "utf8");
    process.stderr.write(`wrote ${dest}\n`);
    if (found.present.length) {
      process.stderr.write(
        `on PATH: ${found.present.map((item) => item.bin).join(", ")}\n`,
      );
    } else {
      process.stderr.write("no product CLIs on PATH — yaml has the api harness only.\n");
    }
    const sample = found.present[0]?.slug ?? "api";
    process.stderr.write(
      `next: bash cli/run.sh --harness ${sample} --effort high --model-name "…" --list-input 3 --list-output 15\n`,
    );
    return;
  }

  if (command === "suite") {
    const suite = await loadOfficialSuite(root);
    process.stdout.write(`${JSON.stringify(lockfileOf(suite), null, 2)}\n`);
    return;
  }

  if (command === "harnesses") {
    const config = await loadEvalConfig(str(flags, "config") || undefined);
    process.stdout.write(`config ${config.path}\n`);
    for (const [name, entry] of Object.entries(config.harnesses)) {
      const how =
        entry.type === "api"
          ? `api ${entry.base_url ?? ""}`
          : (entry.argv ?? []).join(" ");
      process.stdout.write(`${name}  catalog=${entry.catalogSlug}  ${how}\n`);
    }
    return;
  }

  if (command === "verify") {
    const file = rest[1];
    if (!file) throw new Error("verify needs a package path.");
    const raw = await import("node:fs/promises").then((fs) =>
      fs.readFile(path.resolve(file), "utf8"),
    );
    const pkg = parseEvalPackage(JSON.parse(raw));
    const official = await loadOfficialSuite(root);
    const result = verifyPackage(pkg, official);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (command !== "run") {
    throw new Error(
      `Unknown command "${command}". Next: npx tsx cli/metered-eval.ts help`,
    );
  }

  const config = await loadEvalConfig(str(flags, "config") || undefined);
  const harnessKey =
    str(flags, "harness") ||
    (Object.keys(config.harnesses).length === 1 ? Object.keys(config.harnesses)[0] : "");
  if (!harnessKey) {
    throw new Error(
      `--harness is required. Known: ${Object.keys(config.harnesses).join(", ")}.`,
    );
  }
  const entry = config.harnesses[harnessKey];
  if (!entry) {
    throw new Error(
      `Harness "${harnessKey}" is not in ${config.path}. Known: ${Object.keys(config.harnesses).join(", ")}.`,
    );
  }

  const skuFlag = str(flags, "sku", str(flags, "model-id"));
  const baseUrl = str(flags, "base-url") || entry.base_url || "";
  const catalog = await loadCatalog({ timeoutMs: 5000 });
  const detected = resolveCatalogModel(catalog, DEFAULT_ALIASES, {
    sku: skuFlag,
    provider: str(flags, "provider"),
    lab: str(flags, "lab"),
    modelName: str(flags, "model-name"),
    harnessSlug: entry.catalogSlug,
    baseUrl,
  });
  const modelName = str(flags, "model-name") || detected?.modelName || "";
  const listInput = num(flags, "list-input") ?? detected?.listInput ?? null;
  const missing: string[] = [];
  if (!modelName) missing.push("--model-name");
  if (listInput == null) missing.push("--list-input");
  if (missing.length) {
    throw new Error(`missing ${missing.join(" ")}.\nexample:\n  ${NEXT_RUN}`);
  }
  if (listInput == null || (listInput <= 0 && !detected)) {
    throw new Error("--list-input must be a positive $/M number, or a SKU models.dev knows.");
  }
  const effortRaw = str(flags, "effort") || str(flags, "setting");
  const effort = effortRaw ? parseEffort(effortRaw) : config.defaultEffort;
  if (effort == null) {
    throw new Error(
      `--effort must be ${EFFORT_LEVELS}. Got "${effortRaw}".`,
    );
  }

  const driver = driverFromConfig(entry, {
    bin: str(flags, "bin") || undefined,
    modelId: str(flags, "model-id") || undefined,
    setting: effort,
    baseUrl: str(flags, "base-url") || undefined,
    apiKey:
      str(flags, "api-key") ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      undefined,
  });

  const pkg = await runLocalEval({
    root,
    modelName,
    lab: str(flags, "lab") || detected?.labName || "",
    harnessSlug: entry.catalogSlug,
    provider:
      str(flags, "provider") ||
      detected?.providerName ||
      (entry.type === "api" ? "OpenRouter" : harnessKey),
    providerId: detected?.providerId,
    baseUrl: baseUrl || undefined,
    sku: skuFlag || detected?.sku || "",
    setting: effort,
    listInput,
    listOutput: num(flags, "list-output") ?? detected?.listOutput ?? null,
    maxAttempts: num(flags, "max-attempts") ?? config.maxAttempts,
    driver,
  });

  const out = await resolveOutPath(
    str(flags, "out"),
    `${pkg.stack.modelSlug}-${harnessKey}-${effort}.metered.json`,
  );
  await writeFile(out, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  process.stderr.write(`sealed ${out}\nintegrity ${pkg.integrity}\n`);
}

async function resolveOutPath(flag: string, filename: string): Promise<string> {
  if (!flag) return path.resolve(filename);
  const target = path.resolve(flag);
  try {
    const info = await stat(target);
    if (info.isDirectory()) return path.join(target, filename);
  } catch {
    if (!path.extname(target)) {
      await mkdir(target, { recursive: true });
      return path.join(target, filename);
    }
  }
  await mkdir(path.dirname(target), { recursive: true });
  return target;
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
