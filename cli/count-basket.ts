#!/usr/bin/env npx tsx
/**
 * Count frozen basket slices with local tokenizers and official lab count APIs.
 * Provider keys stay in the environment (or optional --cli-auth files).
 * The web app never accepts them.
 *
 *   npm run count:basket
 *   npm run count:basket -- --cli-auth --out .cache/basket-counts.json
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SLICES } from "@/features/basket/slices";
import { loadCatalog } from "@/features/catalog/models-dev";
import {
  mergeCountTargets,
  parseCountList,
  parseModelRef,
  type CountTarget,
} from "@/features/measure/count-list";
import { routeCountTarget, type CountRoute } from "@/features/measure/count-route";
import {
  BASKET_VERSION,
  characterCount,
  fertility,
  meteredUnits,
  weightedMean,
} from "@/features/pricing/math";
import type { SliceId } from "@/features/pricing/types";
import { fert } from "@/shared/lib/format";

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

function help(): string {
  return `count-basket — native-token fertility of basket ${BASKET_VERSION}.

Fertility = native tokens / MU.  1 MU = 4 Unicode characters (NFC, LF).
Local tables run always. Lab count APIs run when a key is set.

  npm run count:basket
  npm run count:basket -- --cli-auth --out .cache/basket-counts.json

Models come from cli/count-basket.yaml (or .txt). Open-weight rows
count locally from Hugging Face. Closed labs use a count API.
Add a models.dev id, or pass --model. The site import matches those ids.

--models file     list of models (default cli/count-basket.yaml)
--model id[,id]   extra models.dev ids or SKUs (claude-opus-5)
--list            print the resolved count list and exit
--cli-auth        if env is empty, read Claude / Grok CLI login tokens
--local-only      skip lab APIs
--api-only        skip local Hugging Face / tiktoken
--out file        write the JSON result
--cache dir       tokenizer file cache (default .cache/tokenizers)
--help

Keys (never put these in the web app or .env.example):
  ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN   Claude count_tokens
  XAI_API_KEY                                 Grok tokenize-text
  GEMINI_API_KEY or GOOGLE_API_KEY            Gemini countTokens
  MOONSHOT_API_KEY                            Kimi estimate-token-count
  HF_TOKEN                                    only if a Hub repo is gated

Exit: 0 ok, 1 usage / load error. A skipped lab API is not a failure.
`;
}

type LoadedSlice = {
  id: SliceId;
  label: string;
  weight: number;
  text: string;
  characters: number;
};

type SliceCount = {
  tokens: number;
  fertility: number;
  framing: number;
};

type TokenizerResult = {
  id: string;
  label: string;
  kind: "local" | "api";
  source: string;
  catalogId?: string;
  sku?: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
  slices: Partial<Record<SliceId, SliceCount>>;
  totalTokens: number | null;
  fertility: number | null;
};

type Counter = {
  id: string;
  label: string;
  kind: "local" | "api";
  source: string;
  catalogId?: string;
  sku?: string;
  ready: () => string | null;
  count: (text: string) => Promise<{ tokens: number; framing: number }>;
};

const ROOT = process.cwd();
const HOME = os.homedir();

function log(message: string) {
  process.stderr.write(`${message}\n`);
}

async function loadSlices(): Promise<LoadedSlice[]> {
  return Promise.all(
    SLICES.map(async (slice) => {
      const text = await readFile(path.join(ROOT, "data", "basket", slice.file), "utf8");
      return {
        id: slice.id,
        label: slice.label,
        weight: slice.weight,
        text,
        characters: characterCount(text),
      };
    }),
  );
}

function envFirst(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function isOauthAnthropic(token: string): boolean {
  return token.startsWith("sk-ant-oat") || token.startsWith("sk-ant-ort");
}

type ClaudeOauth = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

async function readClaudeOauth(): Promise<{ oauth: ClaudeOauth; from: "keychain" | "file" } | null> {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    const { stdout } = await exec("security", [
      "find-generic-password",
      "-s",
      "Claude Code-credentials",
      "-w",
    ]);
    const parsed = JSON.parse(stdout) as { claudeAiOauth?: ClaudeOauth };
    if (parsed.claudeAiOauth?.accessToken || parsed.claudeAiOauth?.refreshToken) {
      return { oauth: parsed.claudeAiOauth, from: "keychain" };
    }
  } catch {
    // fall through to the file copy
  }
  try {
    const credPath = path.join(HOME, ".claude", ".credentials.json");
    const parsed = JSON.parse(await readFile(credPath, "utf8")) as {
      claudeAiOauth?: ClaudeOauth;
    };
    if (parsed.claudeAiOauth?.accessToken || parsed.claudeAiOauth?.refreshToken) {
      return { oauth: parsed.claudeAiOauth, from: "file" };
    }
  } catch {
    // no local Claude login
  }
  return null;
}

async function applyCliAuth() {
  if (!envFirst("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")) {
    const loaded = await readClaudeOauth();
    const token = loaded?.oauth.accessToken?.trim();
    if (loaded && token) {
      process.env.ANTHROPIC_AUTH_TOKEN = token;
      log(`auth  Claude CLI login (${loaded.from})`);
    }
  }

  if (!envFirst("XAI_API_KEY")) {
    const authPath = path.join(HOME, ".grok", "auth.json");
    try {
      const raw = JSON.parse(await readFile(authPath, "utf8")) as Record<
        string,
        { key?: string }
      >;
      const entry = Object.values(raw).find((item) => item?.key);
      if (entry?.key) {
        process.env.XAI_API_KEY = entry.key;
        log("auth  Grok CLI login");
      }
    } catch {
      // no local Grok login
    }
  }
}

async function fetchJson(
  url: string,
  init: RequestInit,
  attempts = 5,
): Promise<{ status: number; body: unknown }> {
  let last = "request failed";
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch(url, init);
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: text.slice(0, 400) };
    }
    if (res.status === 429 || res.status >= 500) {
      const detail = errMessage(body);
      last = detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`;
      const quota = last.toLowerCase();
      if (quota.includes("insufficient") || quota.includes("quota") || quota.includes("suspended")) {
        return { status: res.status, body };
      }
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500 * 2 ** i;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    return { status: res.status, body };
  }
  throw new Error(last);
}

function errMessage(body: unknown): string {
  if (!body || typeof body !== "object") return String(body);
  const rec = body as Record<string, unknown>;
  const err = rec.error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  if (typeof rec.message === "string") return rec.message;
  return JSON.stringify(body).slice(0, 240);
}

async function countWithFraming(
  countRaw: (text: string) => Promise<number>,
  text: string,
): Promise<{ tokens: number; framing: number }> {
  const probe = ".";
  const [full, baseline] = await Promise.all([countRaw(text), countRaw(probe)]);
  const framing = Math.max(0, baseline - 1);
  return { tokens: Math.max(0, full - framing), framing };
}

function tiktokenCounter(encoding: "o200k_base" | "cl100k_base"): Counter {
  return {
    id: encoding,
    label: encoding === "o200k_base" ? "OpenAI o200k (GPT-4o / 5.x)" : "OpenAI cl100k (GPT-4)",
    kind: "local",
    source: `js-tiktoken ${encoding}`,
    ready: () => null,
    async count(text) {
      const { getEncoding } = await import("js-tiktoken");
      const enc = getEncoding(encoding);
      return { tokens: enc.encode(text).length, framing: 0 };
    },
  };
}

async function readCachedJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function downloadHubJson(args: {
  repo: string;
  file: string;
  dest: string;
  token: string;
  optional?: boolean;
}): Promise<unknown | null> {
  const cached = await readCachedJson(args.dest);
  if (cached) return cached;
  const url = `https://huggingface.co/${args.repo}/resolve/main/${args.file}`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (args.token) headers.authorization = `Bearer ${args.token}`;
  const res = await fetch(url, { headers, redirect: "follow" });
  if (res.status === 404 && args.optional) return {};
  if (!res.ok) {
    throw new Error(`${args.repo} ${args.file}: HTTP ${res.status}`);
  }
  const body = await res.json();
  await mkdir(path.dirname(args.dest), { recursive: true });
  await writeFile(args.dest, JSON.stringify(body));
  return body;
}

function hfCounter(args: {
  id: string;
  label: string;
  repo: string;
  cacheDir: string;
}): Counter {
  let loaded: { encode: (text: string) => number } | null = null;
  let loadError: string | null = null;
  return {
    id: args.id,
    label: args.label,
    kind: "local",
    source: `huggingface ${args.repo}`,
    ready: () => loadError,
    async count(text) {
      if (!loaded) {
        const { Tokenizer } = await import("@huggingface/tokenizers");
        const token = envFirst("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN");
        const slug = args.repo.replace(/\//g, "--");
        const base = path.join(args.cacheDir, slug);
        const tokenizerJson = await downloadHubJson({
          repo: args.repo,
          file: "tokenizer.json",
          dest: path.join(base, "tokenizer.json"),
          token,
        });
        const tokenizerConfig =
          (await downloadHubJson({
            repo: args.repo,
            file: "tokenizer_config.json",
            dest: path.join(base, "tokenizer_config.json"),
            token,
            optional: true,
          })) ?? {};
        const tokenizer = new Tokenizer(tokenizerJson as object, tokenizerConfig as object);
        loaded = {
          encode: (value: string) =>
            tokenizer.encode(value, { add_special_tokens: false }).ids.length,
        };
      }
      return { tokens: loaded.encode(text), framing: 0 };
    },
  };
}

function anthropicCounter(model: string, label: string): Counter {
  return {
    id: `anthropic:${model}`,
    label,
    kind: "api",
    source: `Anthropic count_tokens ${model}`,
    ready: () =>
      envFirst("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")
        ? null
        : "set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN",
    async count(text) {
      const key = envFirst("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN");
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      };
      if (isOauthAnthropic(key)) {
        headers.authorization = `Bearer ${key}`;
        headers["anthropic-beta"] = "oauth-2025-04-20";
      } else {
        headers["x-api-key"] = key;
      }
      return countWithFraming(async (value) => {
        const { status, body } = await fetchJson(
          "https://api.anthropic.com/v1/messages/count_tokens",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: value }],
            }),
          },
        );
        const tokens = (body as { input_tokens?: number }).input_tokens;
        if (status >= 400 || typeof tokens !== "number") {
          throw new Error(errMessage(body));
        }
        return tokens;
      }, text);
    },
  };
}

function geminiCounter(model: string, label: string): Counter {
  return {
    id: `gemini:${model}`,
    label,
    kind: "api",
    source: `Gemini countTokens ${model}`,
    ready: () =>
      envFirst("GEMINI_API_KEY", "GOOGLE_API_KEY")
        ? null
        : "set GEMINI_API_KEY or GOOGLE_API_KEY",
    async count(text) {
      const key = envFirst("GEMINI_API_KEY", "GOOGLE_API_KEY");
      return countWithFraming(async (value) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens`;
        const { status, body } = await fetchJson(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: value }] }],
          }),
        });
        const tokens = (body as { totalTokens?: number }).totalTokens;
        if (status >= 400 || typeof tokens !== "number") {
          throw new Error(errMessage(body));
        }
        return tokens;
      }, text);
    },
  };
}

function xaiCounter(model: string, label: string): Counter {
  return {
    id: `xai:${model}`,
    label,
    kind: "api",
    source: `xAI tokenize-text ${model}`,
    ready: () => (envFirst("XAI_API_KEY") ? null : "set XAI_API_KEY"),
    async count(text) {
      const key = envFirst("XAI_API_KEY");
      const { status, body } = await fetchJson("https://api.x.ai/v1/tokenize-text", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ text, model }),
      });
      const ids = (body as { token_ids?: unknown }).token_ids;
      if (status >= 400 || !Array.isArray(ids)) {
        throw new Error(errMessage(body));
      }
      return { tokens: ids.length, framing: 0 };
    },
  };
}

function counterFromRoute(route: Exclude<CountRoute, { via: "none" }>, cacheDir: string): Counter {
  if (route.via === "local") {
    return {
      ...hfCounter({
        id: route.catalogId,
        label: route.label,
        repo: route.repo,
        cacheDir,
      }),
      catalogId: route.catalogId,
      sku: route.sku,
    };
  }
  const base =
    route.lab === "anthropic"
      ? anthropicCounter(route.sku, route.label)
      : route.lab === "xai"
        ? xaiCounter(route.sku, route.label)
        : route.lab === "gemini"
          ? geminiCounter(route.sku, route.label)
          : moonshotCounter(route.sku, route.label);
  return {
    ...base,
    id: route.catalogId,
    catalogId: route.catalogId,
    sku: route.sku,
  };
}

async function loadTargets(flags: Flags): Promise<{ file: string | null; targets: CountTarget[] }> {
  const explicit = str(flags, "models");
  const candidates = explicit
    ? [explicit]
    : [
        path.join("cli", "count-basket.yaml"),
        path.join("cli", "count-basket.yml"),
        path.join("cli", "count-basket.txt"),
        "count-basket.yaml",
      ];
  let fromFile: CountTarget[] = [];
  let file: string | null = null;
  for (const rel of candidates) {
    try {
      const text = await readFile(path.resolve(ROOT, rel), "utf8");
      fromFile = parseCountList(text);
      file = rel;
      break;
    } catch (error) {
      if (explicit) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Cannot read ${rel}: ${detail}`);
      }
    }
  }
  const extras: CountTarget[] = [];
  const raw = flags.model;
  if (typeof raw === "string") {
    for (const token of raw.split(",")) {
      const parsed = parseModelRef(token);
      if (!parsed) throw new Error(`Not a model id or known SKU: ${token.trim()}`);
      extras.push(parsed);
    }
  }
  return { file, targets: mergeCountTargets(fromFile, extras) };
}

function moonshotCounter(model: string, label: string): Counter {
  return {
    id: `moonshot:${model}`,
    label,
    kind: "api",
    source: `Moonshot estimate-token-count ${model}`,
    ready: () => (envFirst("MOONSHOT_API_KEY") ? null : "set MOONSHOT_API_KEY"),
    async count(text) {
      const key = envFirst("MOONSHOT_API_KEY");
      return countWithFraming(async (value) => {
        const { status, body } = await fetchJson(
          "https://api.moonshot.ai/v1/tokenizers/estimate-token-count",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: value }],
            }),
          },
        );
        const tokens = (body as { data?: { total_tokens?: number } }).data?.total_tokens;
        if (status >= 400 || typeof tokens !== "number") {
          throw new Error(errMessage(body));
        }
        return tokens;
      }, text);
    },
  };
}

function buildCounters(
  cacheDir: string,
  routes: Exclude<CountRoute, { via: "none" }>[],
): Counter[] {
  return [
    tiktokenCounter("o200k_base"),
    tiktokenCounter("cl100k_base"),
    hfCounter({
      id: "qwen3",
      label: "Qwen3",
      repo: "Qwen/Qwen3-8B",
      cacheDir,
    }),
    hfCounter({
      id: "deepseek-v3",
      label: "DeepSeek V3",
      repo: "deepseek-ai/DeepSeek-V3",
      cacheDir,
    }),
    hfCounter({
      id: "llama-3.1",
      label: "Llama 3.1",
      repo: "NousResearch/Meta-Llama-3.1-8B",
      cacheDir,
    }),
    hfCounter({
      id: "mistral",
      label: "Mistral",
      repo: "mistralai/Mistral-7B-Instruct-v0.2",
      cacheDir,
    }),
    hfCounter({
      id: "gemma-2",
      label: "Gemma 2",
      repo: "unsloth/gemma-2-9b-it",
      cacheDir,
    }),
    ...routes.map((route) => counterFromRoute(route, cacheDir)),
  ];
}

async function runCounter(
  counter: Counter,
  slices: LoadedSlice[],
): Promise<TokenizerResult> {
  const skip = counter.ready();
  if (skip) {
    return {
      id: counter.id,
      label: counter.label,
      kind: counter.kind,
      source: counter.source,
      catalogId: counter.catalogId,
      sku: counter.sku,
      status: "skipped",
      detail: skip,
      slices: {},
      totalTokens: null,
      fertility: null,
    };
  }

  const counted: Partial<Record<SliceId, SliceCount>> = {};
  try {
    for (const slice of slices) {
      log(`  ${counter.id}  ${slice.id}`);
      const { tokens, framing } = await counter.count(slice.text);
      const fertValue = fertility(tokens, slice.characters);
      if (fertValue == null) {
        throw new Error(`no fertility for ${slice.id}`);
      }
      counted[slice.id] = { tokens, fertility: fertValue, framing };
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      id: counter.id,
      label: counter.label,
      kind: counter.kind,
      source: counter.source,
      catalogId: counter.catalogId,
      sku: counter.sku,
      status: "error",
      detail,
      slices: counted,
      totalTokens: null,
      fertility: null,
    };
  }

  const totalTokens = slices.reduce((sum, slice) => sum + (counted[slice.id]?.tokens ?? 0), 0);
  const composite = weightedMean(
    slices.map((slice) => ({
      value: counted[slice.id]!.fertility,
      weight: slice.weight,
    })),
  );
  return {
    id: counter.id,
    label: counter.label,
    kind: counter.kind,
    source: counter.source,
    catalogId: counter.catalogId,
    sku: counter.sku,
    status: "ok",
    slices: counted,
    totalTokens,
    fertility: composite,
  };
}

function pad(value: string, width: number, align: "left" | "right" = "left"): string {
  return align === "right" ? value.padStart(width) : value.padEnd(width);
}

function formatTable(slices: LoadedSlice[], rows: TokenizerResult[]): string {
  const chars = slices.reduce((sum, slice) => sum + slice.characters, 0);
  const units = meteredUnits(chars);
  const head = [
    pad("tokenizer", 28),
    pad("src", 5),
    pad("tokens", 8, "right"),
    pad("fert", 7, "right"),
    ...slices.map((slice) => pad(slice.id.slice(0, 7), 8, "right")),
  ].join("  ");
  const lines = [
    `${BASKET_VERSION}   ${chars} chars   ${units.toFixed(2)} MU`,
    "",
    head,
    "-".repeat(head.length),
  ];
  for (const row of rows) {
    if (row.status !== "ok") {
      lines.push(
        `${pad(row.label, 28)}  ${pad(row.kind, 5)}  ${pad(row.status, 8, "right")}  ${row.detail ?? ""}`,
      );
      continue;
    }
    lines.push(
      [
        pad(row.label, 28),
        pad(row.kind, 5),
        pad(String(row.totalTokens), 8, "right"),
        pad(fert(row.fertility), 7, "right"),
        ...slices.map((slice) => pad(fert(row.slices[slice.id]?.fertility ?? null), 8, "right")),
      ].join("  "),
    );
  }
  return lines.join("\n");
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags.help === true || flags.h === true) {
    process.stdout.write(help());
    return;
  }

  if (flags["cli-auth"] === true) {
    await applyCliAuth();
  }

  const { file: listFile, targets } = await loadTargets(flags);
  const catalog = await loadCatalog();
  const routed = targets.map((target) => routeCountTarget(target, catalog));
  const usable = routed.filter(
    (route): route is Exclude<CountRoute, { via: "none" }> => route.via !== "none",
  );
  if (flags.list === true) {
    process.stdout.write(`${listFile ?? "(no list file)"}\n`);
    for (const route of routed) {
      const extra =
        route.via === "local"
          ? `local  ${route.repo}`
          : route.via === "api"
            ? "api"
            : `skip  ${route.reason}`;
      process.stdout.write(`  ${route.catalogId}  ${extra}\n`);
    }
    return;
  }
  for (const route of routed) {
    if (route.via === "none") log(`skip  ${route.catalogId}  ${route.reason}`);
  }

  const cacheDir = path.resolve(str(flags, "cache", path.join(ROOT, ".cache", "tokenizers")));
  const slices = await loadSlices();
  const chars = slices.reduce((sum, slice) => sum + slice.characters, 0);
  log(
    `${BASKET_VERSION}  ${slices.length} slices  ${chars} chars  ${meteredUnits(chars).toFixed(2)} MU`,
  );
  if (listFile) {
    const localN = usable.filter((route) => route.via === "local").length;
    const apiN = usable.filter((route) => route.via === "api").length;
    log(`models ${listFile}  ${localN} local  ${apiN} api`);
  }

  const localOnly = flags["local-only"] === true;
  const apiOnly = flags["api-only"] === true;
  const counters = buildCounters(cacheDir, usable).filter((counter) => {
    if (localOnly) return counter.kind === "local";
    if (apiOnly) return counter.kind === "api";
    return true;
  });

  const results: TokenizerResult[] = [];
  for (const counter of counters) {
    log(`count ${counter.id}`);
    results.push(await runCounter(counter, slices));
  }

  process.stdout.write(`${formatTable(slices, results)}\n`);

  const payload = {
    basketVersion: BASKET_VERSION,
    countedAt: new Date().toISOString(),
    characters: Object.fromEntries(slices.map((slice) => [slice.id, slice.characters])),
    meteredUnits: meteredUnits(chars),
    tokenizers: results,
  };
  const out = str(flags, "out");
  if (out) {
    const dest = path.resolve(out);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, `${JSON.stringify(payload, null, 2)}\n`);
    log(`wrote ${dest}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
