import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { EFFORTS, type Effort } from "@/features/eval/effort";
import { HARNESSES } from "@/features/harness/catalog";
import { DEFAULT_MAX_ATTEMPTS } from "@/features/pricing/math";

const harnessEntry = z.object({
  type: z.enum(["api", "command"]).default("command"),
  catalog: z.string().optional(),
  argv: z.array(z.string()).optional(),
  base_url: z.string().optional(),
});

const fileSchema = z.object({
  max_attempts: z.number().int().min(1).max(8).optional(),
  default_effort: z.enum(EFFORTS).optional(),
  harnesses: z.record(z.string(), harnessEntry),
});

export type HarnessConfig = z.infer<typeof harnessEntry> & {
  slug: string;
  catalogSlug: string;
};

export type EvalConfig = {
  path: string;
  maxAttempts: number;
  defaultEffort: Effort;
  harnesses: Record<string, HarnessConfig>;
};

export async function loadEvalConfig(explicit?: string): Promise<EvalConfig> {
  const candidates = explicit
    ? [explicit]
    : ["metered-eval.yaml", "metered-eval.yml", path.join("cli", "metered-eval.yaml")];

  let lastError = "No metered-eval.yaml found.";
  for (const rel of candidates) {
    const abs = path.resolve(rel);
    try {
      const raw = await readFile(abs, "utf8");
      const parsed = fileSchema.parse(parse(raw));
      const harnesses: Record<string, HarnessConfig> = {};
      for (const [slug, entry] of Object.entries(parsed.harnesses)) {
        const catalogSlug = entry.catalog ?? slug;
        if (!HARNESSES.some((item) => item.slug === catalogSlug)) {
          throw new Error(
            `${rel}: harness "${slug}" maps to unknown catalog slug "${catalogSlug}". Use a known slug or catalog: custom.`,
          );
        }
        if (entry.type === "command" && (!entry.argv || entry.argv.length === 0)) {
          throw new Error(`${rel}: harness "${slug}" needs an argv list.`);
        }
        harnesses[slug] = { ...entry, slug, catalogSlug };
      }
      return {
        path: abs,
        maxAttempts: parsed.max_attempts ?? DEFAULT_MAX_ATTEMPTS,
        defaultEffort: parsed.default_effort ?? "default",
        harnesses,
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        lastError = `No config at ${abs}.`;
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${lastError} Pass --config path/to/metered-eval.yaml.`);
}
