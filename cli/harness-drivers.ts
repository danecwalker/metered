import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { HarnessConfig } from "./load-config";
import { apiReasoningEffort, type Effort } from "@/features/eval/effort";
import type { HarnessDriver, HarnessTurn } from "@/features/eval/run-local";
import type { OfficialTask } from "@/features/eval/types";

export type Usage = HarnessTurn["usage"];

export type DriverOpts = {
  modelId?: string;
  setting?: Effort;
  baseUrl?: string;
  apiKey?: string;
  bin?: string;
};

export function driverFromConfig(
  entry: HarnessConfig,
  opts: DriverOpts,
): HarnessDriver {
  if (entry.type === "api") {
    if (!opts.apiKey) {
      throw new Error("API harness needs --api-key or OPENROUTER_API_KEY / OPENAI_API_KEY.");
    }
    return {
      slug: entry.catalogSlug,
      run: (task) =>
        completeOnce({
          baseUrl: opts.baseUrl ?? entry.base_url ?? "https://openrouter.ai/api/v1",
          apiKey: opts.apiKey as string,
          model: opts.modelId ?? "",
          prompt: task.prompt,
          effort: opts.setting ?? "default",
        }),
    };
  }

  const template = entry.argv ?? [];
  return {
    slug: entry.catalogSlug,
    async run(task: OfficialTask) {
      const promptFile = path.join(os.tmpdir(), `metered-${task.id}-${Date.now()}.txt`);
      const needsFile = template.some((part) => part.includes("{prompt_file}"));
      if (needsFile) {
        await writeFile(promptFile, task.prompt, "utf8");
      }
      const vars: Record<string, string> = {
        prompt: task.prompt,
        prompt_file: promptFile,
        model: opts.modelId ?? "",
        task_id: task.id,
        setting: opts.setting ?? "default",
        effort: opts.setting ?? "default",
      };
      let argv = template.map((part) => substitute(part, vars));
      if (opts.bin && argv[0]) {
        argv = [opts.bin, ...argv.slice(1)];
      }
      const result = await spawnCapture(argv[0], argv.slice(1));
      if (result.code !== 0) {
        throw new Error(
          `${argv[0]} exited ${result.code} on ${task.id}: ${result.stderr || result.stdout}`,
        );
      }
      return {
        output: result.stdout.trim(),
        usage: parseUsageBlob(`${result.stdout}\n${result.stderr}`),
        providerUsage: {
          argv: redactPrompt(argv, task.prompt),
          exit: result.code,
          stderr: result.stderr.slice(-4000),
        },
      };
    },
  };
}

function substitute(part: string, vars: Record<string, string>): string {
  return part.replace(/\{([a-z_]+)\}/g, (_, key: string) => vars[key] ?? "");
}

async function completeOnce(args: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  effort: Effort;
}): Promise<HarnessTurn> {
  if (!args.model) throw new Error("API harness needs --model-id.");
  const root = args.baseUrl.replace(/\/+$/, "");
  const url = root.endsWith("/chat/completions") ? root : `${root}/chat/completions`;
  const reasoningEffort = apiReasoningEffort(args.effort);
  const body: Record<string, unknown> = {
    model: args.model,
    temperature: 0,
    messages: [{ role: "user", content: args.prompt }],
  };
  if (reasoningEffort) {
    body.reasoning = { effort: reasoningEffort };
    body.reasoning_effort = reasoningEffort;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string | null } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
      reasoning_tokens?: number;
      prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Provider returned ${response.status}.`);
  }
  const usage = payload.usage ?? {};
  if (usage.prompt_tokens == null && usage.completion_tokens == null) {
    throw new Error("Provider response had no usage. Cannot seal a priced package.");
  }
  return {
    output: payload.choices?.[0]?.message?.content ?? "",
    providerUsage: payload.usage ?? null,
    usage: {
      input: int(usage.prompt_tokens ?? usage.input_tokens),
      output: int(usage.completion_tokens ?? usage.output_tokens),
      reasoning: int(
        usage.completion_tokens_details?.reasoning_tokens ?? usage.reasoning_tokens,
      ),
      cacheHit: int(
        usage.prompt_tokens_details?.cached_tokens ?? usage.cache_read_input_tokens,
      ),
      cacheWrite: int(
        usage.prompt_tokens_details?.cache_write_tokens ?? usage.cache_creation_input_tokens,
      ),
    },
  };
}

function fieldsFromUsage(parsed: Record<string, unknown>): Usage {
  const details =
    parsed.prompt_tokens_details && typeof parsed.prompt_tokens_details === "object"
      ? (parsed.prompt_tokens_details as Record<string, unknown>)
      : {};
  const outDetails =
    parsed.completion_tokens_details && typeof parsed.completion_tokens_details === "object"
      ? (parsed.completion_tokens_details as Record<string, unknown>)
      : {};
  return {
    input: int(parsed.input ?? parsed.prompt_tokens ?? parsed.input_tokens),
    output: int(parsed.output ?? parsed.completion_tokens ?? parsed.output_tokens),
    reasoning: int(
      parsed.reasoning ?? parsed.reasoning_tokens ?? outDetails.reasoning_tokens,
    ),
    cacheHit: int(
      parsed.cacheHit ??
        parsed.cached_tokens ??
        parsed.cache_read_input_tokens ??
        details.cached_tokens,
    ),
    cacheWrite: int(
      parsed.cacheWrite ??
        parsed.cache_creation_input_tokens ??
        parsed.cacheCreationTokens ??
        parsed.inputCacheCreation ??
        details.cache_write_tokens,
    ),
  };
}

function parseUsageBlob(text: string): Usage {
  const lines = text.split(/\r?\n/).reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed.usage && typeof parsed.usage === "object") {
        const nested = fieldsFromUsage(parsed.usage as Record<string, unknown>);
        if (
          nested.input +
            nested.output +
            nested.reasoning +
            nested.cacheHit +
            nested.cacheWrite >
          0
        ) {
          return nested;
        }
      }
      if (
        "input" in parsed ||
        "prompt_tokens" in parsed ||
        "input_tokens" in parsed
      ) {
        return fieldsFromUsage(parsed);
      }
    } catch {
      continue;
    }
  }
  return { input: 0, output: 0, reasoning: 0, cacheHit: 0, cacheWrite: 0 };
}

function spawnCapture(bin: string, argv: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(bin, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function redactPrompt(argv: string[], prompt: string): string[] {
  return argv.map((part) => (part === prompt ? `[prompt ${prompt.length} chars]` : part));
}

function int(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
}
